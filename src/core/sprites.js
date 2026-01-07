import { SpriteSheet } from '../kontra.mjs';
import { loadLevelConfig, loaderRegistry, registry } from '../world/level-data.js';
import { getDecorVariantIndex } from '../world/tile-registry.js';
import { TILE, TEXTURE_TILE, COLORS } from './constants.js';

const DECOR_VARIANT_LIMIT = 32;
const BASE_SPRITE_ORDER = [
  'floor',
  'wall',
  'door',
  'door.open',
  'destroy',
  'player',
  'pickup',
  'npc',
  'hana',
  'jara',
  'caretaker',
  'cat',
  'monster',
  'spider',
  'prop',
];
const VARIANT_SPRITE_ORDER = ['decor.console'];
const DECOR_SPRITE_ORDER = Array.from(
  { length: DECOR_VARIANT_LIMIT },
  (_, index) => `decor.${index + 1}`,
);
const SPRITE_ORDER = [...BASE_SPRITE_ORDER, ...VARIANT_SPRITE_ORDER, ...DECOR_SPRITE_ORDER];
const TEXTURE_SEED = 1337;
// Textures are loaded only from their canonical subfolders under assets/.
const TEXTURE_PATHS = {
  floor: 'assets/tiles/floor.png',
  wall: 'assets/walls/wall.png',
  door: 'assets/doors/door.png',
  'door.open': 'assets/doors/door.open.png',
  destroy: 'assets/tiles/destroy.png',
  player: 'assets/hero/hero.png',
  pickup: 'assets/items/pickup.png',
  npc: 'assets/npc/npc.png',
  hana: ['assets/npc/hana.png', 'assets/hana.png'],
  jara: ['assets/npc/jara.png', 'assets/jara.png'],
  caretaker: ['assets/npc/caretaker.png', 'assets/caretaker.png'],
  cat: ['assets/npc/cat.png', 'assets/npc/npc.png'],
  monster: 'assets/npc/monster.png',
  spider: 'assets/npc/spider.png',
};

const VARIANT_TEXTURE_PATHS = {
  'decor.console': ['assets/props/console.png', 'assets/console.png'],
};

function collectDecorVariantsFromTiles(values = [], variants = new Set()) {
  if (!Array.isArray(values)) return;
  values.forEach((value) => {
    const variant = getDecorVariantIndex(value);
    if (variant != null) variants.add(variant);
  });
}

function collectDecorVariantsFromConfig(config, variants = new Set()) {
  if (!config) return variants;
  const layers = config.tileLayers ?? {};
  collectDecorVariantsFromTiles(layers.decor, variants);
  collectDecorVariantsFromTiles(layers.decorUnlocked, variants);
  const unlockMask = layers.unlockMask ?? config.unlockMask ?? [];
  unlockMask.forEach((entry) => {
    const candidate = entry?.decor ?? entry?.tile ?? entry?.tileId ?? entry?.collision;
    const variant = getDecorVariantIndex(candidate);
    if (variant != null) variants.add(variant);
  });
  return variants;
}

async function collectDecorVariantsFromLevels() {
  try {
    const variants = new Set();
    registry.forEach((config) => collectDecorVariantsFromConfig(config, variants));
    for (const [id] of loaderRegistry.entries()) {
      const loaded = await loadLevelConfig(id);
      collectDecorVariantsFromConfig(loaded, variants);
    }
    return [...variants];
  } catch {
    return [];
  }
}

const SPRITE_ANIMATIONS = {
  player: (frameCount) => getDirectionalAnimationDefs('player', frameCount, { includeLegacyDefault: true }),
  npc: (frameCount) => getDirectionalAnimationDefs('npc', frameCount, { includeLegacyDefault: true }),
  hana: (frameCount) => getDirectionalAnimationDefs('hana', frameCount, { includeLegacyDefault: true }),
  jara: (frameCount) => getDirectionalAnimationDefs('jara', frameCount, { includeLegacyDefault: true }),
  caretaker: (frameCount) => getDirectionalAnimationDefs('caretaker', frameCount, { includeLegacyDefault: true }),
  cat: (frameCount) => getDirectionalAnimationDefs('cat', frameCount, { includeLegacyDefault: true }),
  monster: (frameCount) => getDirectionalAnimationDefs('monster', frameCount, { includeLegacyDefault: true }),
  spider: (frameCount) => getDirectionalAnimationDefs('spider', frameCount, { includeLegacyDefault: true }),
};

function getDirectionalAnimationDefs(baseName, frameCount, { includeLegacyDefault = false } = {}) {
  const addLegacy = (frame) => includeLegacyDefault && { name: baseName, frames: [frame] };

  // Prefer 3x4 directional sheets (down, left, right, up) with three frames each.
  if (frameCount >= 12) {
    return [
      { name: `${baseName}WalkDown`, frames: '0..2', frameRate: 8 },
      { name: `${baseName}IdleDown`, frames: [1] },
      { name: `${baseName}WalkLeft`, frames: '3..5', frameRate: 8 },
      { name: `${baseName}IdleLeft`, frames: [4] },
      { name: `${baseName}WalkRight`, frames: '6..8', frameRate: 8 },
      { name: `${baseName}IdleRight`, frames: [7] },
      { name: `${baseName}WalkUp`, frames: '9..11', frameRate: 8 },
      { name: `${baseName}IdleUp`, frames: [10] },
      // Keep a legacy single-frame animation for compatibility with existing lookups
      addLegacy(1),
    ].filter(Boolean);
  }

  if (frameCount >= 5) {
    return [
      { name: `${baseName}Walk`, frames: '0..3', frameRate: 8 },
      { name: `${baseName}Idle`, frames: [4] },
      // Keep a legacy single-frame animation for compatibility with existing lookups
      addLegacy(0),
    ].filter(Boolean);
  }

  return [{ name: `${baseName}Idle`, frames: [0] }, addLegacy(0)].filter(Boolean);
}

function makeCanvas(frames) {
  const cols = 4;
  const rows = Math.ceil(frames.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d');

  frames.forEach((drawFn, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    ctx.save();
    ctx.translate(col * TILE, row * TILE);
    drawFn(ctx);
    ctx.restore();
  });

  return canvas;
}

function createRng(seed = TEXTURE_SEED) {
  let state = seed;

  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveTexturePath(path) {
  // Respect the page base URL so assets also resolve when the game is hosted on
  // a subpath (e.g., GitHub Pages). Fall back to the module URL for local
  // module loaders and bundlers.
  if (typeof document !== 'undefined' && document.baseURI) {
    return new URL(path, document.baseURI).href;
  }

  return new URL(`../../${path}`, import.meta.url).href;
}

function loadTextureImage(path) {
  if (!path) return Promise.resolve(null);

  const resolvedPath = resolveTexturePath(path);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = resolvedPath;
  });
}

async function loadDecorTextures(limit = DECOR_VARIANT_LIMIT) {
  const variantList = Array.isArray(limit)
    ? Array.from(new Set(limit)).filter((value) => Number.isInteger(value) && value > 0)
    : Array.from({ length: limit }, (_, index) => index + 1);

  const entries = await Promise.all(
    variantList.map(async (variant) => {
      const image = await loadTextureImage(`assets/decor/${variant}.gif`);
      return [variant, image];
    }),
  );

  const decorTextures = new Map(entries.filter(([, image]) => Boolean(image)));

  return {
    decorTextures,
    entries: Array.from(decorTextures.entries()).map(([variant, image]) => [`decor.${variant}`, image]),
  };
}

async function loadTextureMap(decorVariants) {
  const [staticEntries, decorResult] = await Promise.all([
    Promise.all(
      [...Object.entries(TEXTURE_PATHS), ...Object.entries(VARIANT_TEXTURE_PATHS)].map(
        async ([name, paths]) => {
          const candidates = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
          const image = await candidates.reduce(async (foundPromise, candidate) => {
            const found = await foundPromise;
            if (found) return found;
            return loadTextureImage(candidate);
          }, Promise.resolve(null));

          return [name, image];
        },
      ),
    ),
    loadDecorTextures(decorVariants),
  ]);

  const textures = [...staticEntries, ...(decorResult?.entries ?? [])].reduce((acc, [name, image]) => {
    if (image) acc[name] = image;
    return acc;
  }, {});

  return { textures, decorTextures: decorResult?.decorTextures ?? new Map() };
}

function jitterColor(hex, amount, random) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((chunk) => parseInt(chunk, 16));

  const clamp = (value) => Math.max(0, Math.min(255, value));

  const toHex = (value) => value.toString(16).padStart(2, '0');

  const jittered = [r, g, b].map((channel) =>
    clamp(channel + Math.round((random() - 0.5) * amount)),
  );

  return `#${jittered.map(toHex).join('')}`;
}

function drawNoise(ctx, x, y, width, height, baseColor, accentColor, density, random) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = accentColor;
  const count = Math.floor(width * height * density);

  for (let i = 0; i < count; i += 1) {
    const px = x + Math.floor(random() * width);
    const py = y + Math.floor(random() * height);
    ctx.fillRect(px, py, 1, 1);
  }
}

async function canvasToImage(canvas) {
  const image = new Image();
  const loadPromise = new Promise((resolve) => {
    image.onload = resolve;
  });
  image.src = canvas.toDataURL('image/png');
  await loadPromise;
  return image;
}

function withTexture(drawFn, seed = TEXTURE_SEED) {
  const random = createRng(seed);
  return (ctx) => drawFn(ctx, random);
}

function drawFromImage(image, sourceTile = TEXTURE_TILE) {
  return (ctx) => ctx.drawImage(image, 0, 0, sourceTile, sourceTile, 0, 0, TILE, TILE);
}

function drawFromImageFrame(image, sx, sy, sourceTile = TEXTURE_TILE) {
  return (ctx) => ctx.drawImage(image, sx, sy, sourceTile, sourceTile, 0, 0, TILE, TILE);
}

function resolveTextureTileSize(texture) {
  if (!texture) return TILE;
  const preferredSizes = [TEXTURE_TILE * 2, TEXTURE_TILE];
  const matchingSize = preferredSizes.find(
    (size) => texture.width % size === 0 && texture.height % size === 0,
  );
  if (matchingSize) return matchingSize;
  return Math.min(TEXTURE_TILE, texture.width, texture.height);
}

function buildSpriteFrames(name, texture) {
  if (!texture) {
    const drawer = DRAWERS[name] ?? DRAWERS[name.split('.')[0]] ?? DRAWERS.prop;
    const variantMatch = name.match(/\.([0-9]+)$/);
    const variantSeed = variantMatch ? TEXTURE_SEED + Number.parseInt(variantMatch[1], 10) : TEXTURE_SEED;
    if (name === 'player') {
      const seeds = [TEXTURE_SEED, TEXTURE_SEED + 1, TEXTURE_SEED + 2, TEXTURE_SEED + 3, TEXTURE_SEED + 4];
      return seeds.map((seed) => withTexture(drawer, seed));
    }
    return [withTexture(drawer, variantSeed)];
  }

  const sourceTile = resolveTextureTileSize(texture);
  const cols = Math.max(1, Math.floor(texture.width / sourceTile));
  const rows = Math.max(1, Math.floor(texture.height / sourceTile));

  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      frames.push(drawFromImageFrame(texture, col * sourceTile, row * sourceTile, sourceTile));
    }
  }

  return frames;
}

function expandFrameSpec(frameSpec, offset) {
  const toArray = (value) => (Array.isArray(value) ? value : [value]);

  if (typeof frameSpec === 'string' && frameSpec.includes('..')) {
    const [start, end] = frameSpec.split('..').map((part) => Number.parseInt(part, 10));
    const step = start <= end ? 1 : -1;
    const frames = [];
    for (let index = start; step > 0 ? index <= end : index >= end; index += step) {
      frames.push(offset + index);
    }
    return frames;
  }

  return toArray(frameSpec).map((frame) => offset + frame);
}

function drawFloor(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.floor, '#0d2d27', 0.03, random);
  ctx.fillStyle = COLORS.floorGlow;
  ctx.fillRect(0, TILE - 6, TILE, 6);
  ctx.fillStyle = 'rgba(92, 242, 204, 0.15)';
  ctx.fillRect(4, 4, TILE - 8, 6);
  ctx.strokeStyle = 'rgba(92, 242, 204, 0.2)';
  ctx.strokeRect(1, 1, TILE - 2, TILE - 2);
}

function drawWall(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.wall, '#0c0c15', 0.02, random);
  ctx.fillStyle = jitterColor(COLORS.wallInner, 14, random);
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#0c0c15';
  ctx.fillRect(5, 5, TILE - 10, TILE - 10);
  ctx.strokeStyle = 'rgba(140, 152, 199, 0.35)';
  ctx.strokeRect(5.5, 5.5, TILE - 11, TILE - 11);
}

function drawDoor(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.doorClosed, '#1b0f14', 0.02, random);
  ctx.fillStyle = jitterColor('#3b262d', 10, random);
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = 'rgba(242, 212, 92, 0.65)';
  ctx.strokeRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#f2d45c';
  ctx.fillRect(TILE / 2 - 2, TILE / 2 - 4, 4, 10);
}

function drawDoorOpen(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.doorOpen, '#102019', 0.02, random);
  ctx.fillStyle = jitterColor('#294233', 12, random);
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = 'rgba(6, 12, 10, 0.7)';
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
  ctx.strokeStyle = COLORS.doorGlow;
  ctx.strokeRect(4.5, 4.5, TILE - 9, TILE - 9);
  ctx.fillStyle = COLORS.doorAccent;
  ctx.fillRect(TILE / 2 - 2, TILE / 2 - 2, 4, 4);
}

function drawPlayer(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0e1f1a', '#17342b', 0.04, random);
  ctx.fillStyle = COLORS.gridBorder;
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.fillStyle = jitterColor('#5cf2cc', 24, random);
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(6, TILE - 10, TILE - 12, 6);
  ctx.strokeStyle = 'rgba(9, 14, 12, 0.5)';
  ctx.strokeRect(3.5, 3.5, TILE - 7, TILE - 7);
}

function drawPickup(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0e0e12', '#131925', 0.03, random);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, TILE - 10, TILE - 16, 8);
  ctx.fillStyle = jitterColor('#f2d45c', 20, random);
  ctx.beginPath();
  ctx.moveTo(TILE / 2, 4);
  ctx.lineTo(TILE - 6, TILE / 2);
  ctx.lineTo(TILE / 2, TILE - 6);
  ctx.lineTo(6, TILE / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 24, 5, 0.7)';
  ctx.stroke();
}

function drawNpc(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#161a2b', '#0d0f18', 0.03, random);
  ctx.fillStyle = jitterColor('#87b0ff', 24, random);
  ctx.fillRect(6, 8, TILE - 12, TILE - 14);
  ctx.fillStyle = '#2b2f48';
  ctx.fillRect(6, TILE - 10, TILE - 12, 8);
  ctx.fillStyle = '#1c2640';
  ctx.fillRect(10, 6, TILE - 20, 4);
  ctx.fillStyle = '#c1dbff';
  ctx.fillRect(10, 12, TILE - 20, 6);
  ctx.fillStyle = '#151824';
  ctx.fillRect(12, TILE - 6, TILE / 2 - 8, 4);
  ctx.fillRect(TILE / 2 + 4, TILE - 6, TILE / 2 - 8, 4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.strokeRect(5.5, 7.5, TILE - 11, TILE - 13);
}

function drawCat(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0f1724', '#0b101a', 0.02, random);
  ctx.fillStyle = jitterColor('#c9b18c', 24, random);
  ctx.fillRect(6, 10, TILE - 12, TILE - 14);
  ctx.fillStyle = '#2a2116';
  ctx.fillRect(8, TILE - 9, TILE - 16, 7);
  ctx.fillStyle = '#f2e2c4';
  ctx.fillRect(TILE / 2 - 3, 10, 6, 6);
  ctx.fillRect(10, 6, 6, 6);
  ctx.fillRect(TILE - 16, 6, 6, 6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeRect(5.5, 9.5, TILE - 11, TILE - 13);
}

function drawMonster(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#220910', '#1a060b', 0.04, random);
  ctx.fillStyle = jitterColor('#f05b78', 26, random);
  ctx.fillRect(4, 6, TILE - 8, TILE - 12);
  ctx.fillStyle = '#2c0d16';
  ctx.fillRect(4, TILE - 10, TILE - 8, 6);
  ctx.fillStyle = '#ffd0df';
  ctx.fillRect(10, 10, 6, 6);
  ctx.fillRect(TILE - 16, 10, 6, 6);
  ctx.fillStyle = '#12060b';
  ctx.fillRect(10, 18, 6, 4);
  ctx.fillRect(TILE - 16, 18, 6, 4);
  ctx.strokeStyle = 'rgba(240, 91, 120, 0.35)';
  ctx.strokeRect(3.5, 5.5, TILE - 7, TILE - 11);
}

function drawSpider(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0f0f14', '#16151d', 0.08, random);

  ctx.save();
  ctx.translate(TILE / 2, TILE / 2 + 2);

  ctx.strokeStyle = '#5c4a63';
  ctx.lineWidth = 2;
  const legLength = TILE / 3;
  const legOffsets = [-TILE / 4, -TILE / 6, TILE / 6, TILE / 4];
  legOffsets.forEach((offset, index) => {
    const direction = index < 2 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(offset, -3);
    ctx.lineTo(offset + direction * legLength, -10);
    ctx.stroke();
  });

  ctx.fillStyle = '#2d2630';
  ctx.beginPath();
  ctx.ellipse(0, 0, TILE / 4, TILE / 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b265c2';
  ctx.beginPath();
  ctx.arc(-5, -2, 3, 0, Math.PI * 2);
  ctx.arc(5, -2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawProp(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#2b2924', '#1d1c18', 0.03, random);
  ctx.fillStyle = '#6f6a5c';
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = '#3a362c';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, TILE - 12, TILE - 12);
  ctx.strokeStyle = '#c8c2af';
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.lineTo(TILE - 6, 12);
  ctx.moveTo(6, TILE - 12);
  ctx.lineTo(TILE - 6, TILE - 12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeRect(3.5, 3.5, TILE - 7, TILE - 7);
}

function drawConsole(ctx, random) {
  drawProp(ctx, random);
  ctx.fillStyle = '#22283a';
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#6ef2a4';
  ctx.fillRect(8, 8, TILE - 16, 6);
  ctx.fillStyle = '#f2d45c';
  ctx.fillRect(8, TILE - 12, TILE / 2 - 8, 6);
}

function drawDestroyOverlay(ctx, random) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeRect(1.5, 1.5, TILE - 3, TILE - 3);
  ctx.strokeStyle = 'rgba(255, 92, 92, 0.6)';
  ctx.beginPath();
  ctx.moveTo(4, TILE / 2 - 2);
  ctx.lineTo(TILE / 2, TILE - 6);
  ctx.lineTo(TILE - 5, TILE / 2 + 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = 'rgba(255, 92, 92, 0.08)';
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
}

function drawDecorOverlay(ctx, random) {
  const base = jitterColor('#1d1d23', 10, random);
  drawNoise(ctx, 0, 0, TILE, TILE, base, '#0c0c15', 0.02, random);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = 'rgba(110, 242, 164, 0.35)';
  ctx.strokeRect(4.5, 4.5, TILE - 9, TILE - 9);

  const emberColor = jitterColor('#f2d45c', 24, random);
  ctx.fillStyle = emberColor;
  ctx.beginPath();
  ctx.arc(TILE / 2, TILE / 2 + 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(242, 116, 92, 0.4)';
  ctx.beginPath();
  ctx.arc(TILE / 2, TILE / 2 - 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function getAnimationDefs(name, frameCount) {
  const definitions = SPRITE_ANIMATIONS[name];
  if (!definitions) return null;
  return typeof definitions === 'function' ? definitions(frameCount) : definitions;
}

const DRAWERS = {
  floor: drawFloor,
  wall: drawWall,
  door: drawDoor,
  'door.open': drawDoorOpen,
  destroy: drawDestroyOverlay,
  player: drawPlayer,
  pickup: drawPickup,
  npc: drawNpc,
  hana: drawNpc,
  jara: drawNpc,
  caretaker: drawNpc,
  cat: drawCat,
  monster: drawMonster,
  spider: drawSpider,
  prop: drawProp,
  'decor.console': drawConsole,
  decor: drawDecorOverlay,
};

function setCanvasRenderingMode(mode) {
  if (typeof document === 'undefined') return;
  document.documentElement?.style?.setProperty('--canvas-rendering', mode);
}

function hasHighResolutionTextures(textures) {
  return Object.values(textures).some((texture) => {
    if (!texture) return false;
    return resolveTextureTileSize(texture) > TEXTURE_TILE;
  });
}

export async function loadSpriteSheet() {
  const discoveredVariants = await collectDecorVariantsFromLevels();
  const decorVariantList =
    discoveredVariants.length > 0
      ? [...new Set(discoveredVariants)].sort((a, b) => a - b)
      : [1];
  const { textures, decorTextures } = await loadTextureMap(decorVariantList);
  const frames = [];
  const animations = {};
  setCanvasRenderingMode(hasHighResolutionTextures(textures) ? 'auto' : 'pixelated');

  const spriteNames = [
    ...SPRITE_ORDER,
    ...Object.keys(textures).filter((name) => !SPRITE_ORDER.includes(name)),
  ];

  spriteNames.forEach((name) => {
    const texture = textures[name];
    const startIndex = frames.length;
    const spriteFrames = buildSpriteFrames(name, texture);
    frames.push(...spriteFrames);

    const animationDefs = getAnimationDefs(name, spriteFrames.length);
    if (animationDefs) {
      animationDefs.forEach(({ name: animationName, frames: frameSpec, frameRate, loop = true }) => {
        animations[animationName] = {
          frames: expandFrameSpec(frameSpec, startIndex),
          frameRate,
          loop,
        };
      });
      if (!animations[name]) {
        animations[name] = { frames: [startIndex] };
      }
    } else {
      animations[name] = { frames: [startIndex] };
    }

    const dynamicVariantNames = {
      floor: 'floor',
      wall: 'wall',
      destroy: 'destroy',
    };

    const dynamicBase = dynamicVariantNames[name];
    if (dynamicBase && spriteFrames.length > 1) {
      for (let i = 1; i < spriteFrames.length; i += 1) {
        animations[`${dynamicBase}.${i + 1}`] = { frames: [startIndex + i] };
      }
    }
  });

  const image = await canvasToImage(makeCanvas(frames));

  const spriteSheet = SpriteSheet({
    image,
    frameWidth: TILE,
    frameHeight: TILE,
    frameMargin: 0,
    animations,
  });

  return Object.assign(spriteSheet, {
    decorTextures,
    decorVariants: decorVariantList,
  });
}

export const SPRITE_NAMES = {
  floor: 'floor',
  wall: 'wall',
  door: 'door',
  doorOpen: 'door.open',
  destroy: 'destroy',
  player: 'player',
  pickup: 'pickup',
  npc: 'npc',
  hana: 'hana',
  jara: 'jara',
  caretaker: 'caretaker',
  cat: 'cat',
  monster: 'monster',
  spider: 'spider',
  prop: 'prop',
  decorConsole: 'decor.console',
  decor: 'decor',
};
