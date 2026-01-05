const loadedDialogues = new Map();
const processedModules = new Set();
let levelModuleEntriesPromise = null;

function deriveIdFromPath(path) {
  const segments = path.split('/');
  const filename = segments.pop() ?? '';
  if (filename === 'index.js') {
    return segments.pop() ?? 'index';
  }
  return filename.replace(/\.js$/, '');
}

async function getLevelModuleEntries() {
  if (levelModuleEntriesPromise) return levelModuleEntriesPromise;

  if (typeof import.meta?.glob === 'function') {
    const globEntries = {
      ...import.meta.glob('../levels/*.js'),
      ...import.meta.glob('../levels/**/index.js'),
    };
    const filtered = Object.entries(globEntries).filter(([path]) => !path.endsWith('/levels/index.js'));
    levelModuleEntriesPromise = Promise.resolve(filtered);
    return levelModuleEntriesPromise;
  }

  levelModuleEntriesPromise = (async () => {
    try {
      const { readdir } = await import('fs/promises');
      const directoryUrl = new URL('../levels/', import.meta.url);

      async function walk(dirUrl) {
        const entries = await readdir(dirUrl, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
          if (entry.isDirectory()) {
            files.push(...(await walk(new URL(`${entry.name}/`, dirUrl))));
          } else if (entry.isFile() && entry.name === 'index.js') {
            const url = new URL(entry.name, dirUrl).href;
            files.push([url, () => import(url)]);
          }
        }
        return files;
      }

      const topLevelEntries = await readdir(directoryUrl, { withFileTypes: true });
      const files = topLevelEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js')
        .map((entry) => {
          const url = new URL(entry.name, directoryUrl).href;
          return [url, () => import(url)];
        });

      const nestedFiles = (
        await Promise.all(
          topLevelEntries
            .filter((entry) => entry.isDirectory())
            .map((entry) => walk(new URL(`${entry.name}/`, directoryUrl))),
        )
      ).flat();

      return [...files, ...nestedFiles];
    } catch {
      return [];
    }
  })();

  return levelModuleEntriesPromise;
}

function extractConfig(moduleValue) {
  const candidate = moduleValue?.default ?? moduleValue;
  if (candidate?.config?.meta) return candidate.config;
  if (candidate?.meta) return candidate;
  if (moduleValue?.config?.meta) return moduleValue.config;
  return Object.values(moduleValue ?? {}).find((value) => value?.meta);
}

function extractDialogues(moduleValue) {
  const candidate = moduleValue?.default ?? moduleValue;
  return candidate?.dialogues ?? moduleValue?.dialogues ?? candidate?.npcScripts ?? {};
}

export async function getDialoguesForLevel(levelId) {
  if (loadedDialogues.has(levelId)) return loadedDialogues.get(levelId) ?? {};

  const entries = await getLevelModuleEntries();
  for (const [path, loader] of entries) {
    if (processedModules.has(path)) continue;
    const moduleValue = await loader();
    processedModules.add(path);

    const dialogues = extractDialogues(moduleValue) ?? {};
    const config = extractConfig(moduleValue);
    const metaId = config?.meta?.id ?? deriveIdFromPath(path);

    if (metaId) {
      loadedDialogues.set(metaId, dialogues);
      if (metaId === levelId) return dialogues;
    }
  }

  loadedDialogues.set(levelId, {});
  return {};
}
