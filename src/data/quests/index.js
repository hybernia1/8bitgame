const loadedQuests = new Map();
const processedModules = new Set();
let levelModuleEntriesPromise = null;

function deriveIdFromPath(path) {
  const filename = path.split('/').pop() ?? '';
  return filename.replace(/\.js$/, '');
}

async function getLevelModuleEntries() {
  if (levelModuleEntriesPromise) return levelModuleEntriesPromise;

  if (typeof import.meta?.glob === 'function') {
    const globEntries = import.meta.glob('../levels/*.js');
    levelModuleEntriesPromise = Promise.resolve(Object.entries(globEntries));
    return levelModuleEntriesPromise;
  }

  levelModuleEntriesPromise = (async () => {
    try {
      const { readdir } = await import('fs/promises');
      const directoryUrl = new URL('../levels/', import.meta.url);
      const files = await readdir(directoryUrl);
      return files
        .filter((file) => file.endsWith('.js'))
        .map((file) => {
          const url = new URL(file, directoryUrl).href;
          return [url, () => import(url)];
        });
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

function extractQuests(moduleValue) {
  const candidate = moduleValue?.default ?? moduleValue;
  return candidate?.quests ?? moduleValue?.quests ?? candidate?.questLines ?? [];
}

export async function getQuestsForLevel(levelId) {
  if (loadedQuests.has(levelId)) return loadedQuests.get(levelId) ?? [];

  const entries = await getLevelModuleEntries();
  for (const [path, loader] of entries) {
    if (processedModules.has(path)) continue;
    const moduleValue = await loader();
    processedModules.add(path);

    const quests = extractQuests(moduleValue) ?? [];
    const config = extractConfig(moduleValue);
    const metaId = config?.meta?.id ?? deriveIdFromPath(path);

    if (metaId) {
      loadedQuests.set(metaId, quests);
      if (metaId === levelId) return quests;
    }
  }

  loadedQuests.set(levelId, []);
  return [];
}
