import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_TILED_IMPORT_OPTIONS } from '../src/data/tiled-presets.js';
import { importTiledLevel } from '../src/world/level-loader.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPS_DIR = path.join(ROOT, 'assets', 'maps');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'maps');

function toIdentifier(base) {
  const cleaned = base
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[^a-zA-Z]+/, '');
  return cleaned || 'tiledMap';
}

function ensureLighting(level) {
  const width = level.dimensions?.width ?? level.width ?? 0;
  const height = level.dimensions?.height ?? level.height ?? 0;
  const lighting = {
    litZones: [...(level.lighting?.litZones ?? [])],
    switches: [...(level.lighting?.switches ?? [])],
  };

  if (lighting.litZones.length === 0 && width && height) {
    lighting.litZones.push({ x: 0, y: 0, w: width, h: height });
  }

  return { ...level, lighting };
}

function validateDimensions(name, config) {
  const dimensions = config.dimensions ?? config.meta?.dimensions ?? {};
  const width = dimensions.width ?? config.width;
  const height = dimensions.height ?? config.height;
  const expectedSize = width * height;
  const layers = config.tileLayers ?? {};

  const collision = layers.collision ?? [];
  const decor = layers.decor ?? collision;

  if (!expectedSize || !Number.isInteger(expectedSize)) {
    throw new Error(`${name}: map is missing width/height metadata`);
  }

  const checks = [
    ['collision', collision],
    ['decor', decor],
  ];

  checks.forEach(([label, values]) => {
    if (!Array.isArray(values) || values.length !== expectedSize) {
      throw new Error(`${name}: ${label} has ${values.length} entries, expected ${expectedSize}`);
    }
  });

  (layers.unlockMask ?? []).forEach((entry, idx) => {
    const index = Number.isInteger(entry?.index)
      ? entry.index
      : Number.isInteger(entry?.tx) && Number.isInteger(entry?.ty)
        ? entry.ty * width + entry.tx
        : null;
    if (!Number.isInteger(index)) {
      throw new Error(`${name}: unlockMask entry #${idx} is missing a valid index/tx/ty`);
    }
    if (index < 0 || index >= expectedSize) {
      throw new Error(`${name}: unlockMask entry #${idx} points outside the map (index ${index})`);
    }
  });
}

function formatModule(name, config, sourceFile) {
  const json = JSON.stringify(config, null, 2);
  return `// Auto-generated from ${sourceFile} via npm run import:maps\nexport const ${name} = ${json};\n`;
}

async function readMaps() {
  const entries = await fs.readdir(MAPS_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.tmj')).map((entry) => entry.name);
}

async function importMaps() {
  const maps = await readMaps();
  if (!maps.length) {
    console.warn(`No .tmj files found in ${MAPS_DIR}`);
    return;
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  /** @type {Array<{ name: string, module: string }>} */
  const exports = [];

  for (const file of maps) {
    const sourcePath = path.join(MAPS_DIR, file);
    const raw = await fs.readFile(sourcePath, 'utf8');
    const mapData = JSON.parse(raw);
    const baseName = file.replace(/\.tmj$/i, '');
    const exportName = toIdentifier(baseName);

    const level = importTiledLevel(mapData, { presets: DEFAULT_TILED_IMPORT_OPTIONS });
    const withLighting = ensureLighting(level);
    validateDimensions(file, withLighting);

    const moduleContents = formatModule(exportName, withLighting, file);
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.js`);
    await fs.writeFile(outputPath, moduleContents);
    exports.push({ name: exportName, module: `./${baseName}.js` });
    console.log(`✔ Imported ${file} -> ${path.relative(ROOT, outputPath)}`);
  }

  const indexLines = exports.map((entry) => `export { ${entry.name} } from '${entry.module}';`);
  const indexPath = path.join(OUTPUT_DIR, 'index.js');
  await fs.writeFile(indexPath, `${indexLines.join('\n')}\n`);
  console.log(`Updated index with ${exports.length} map(s) at ${path.relative(ROOT, indexPath)}`);
}

importMaps().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
