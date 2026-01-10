import defaultLevelModule from '../data/levels/1-abandoned-laboratory/index.js';
import { facilitySample } from '../data/maps/facility-sample.js';
import { normalizeLevelConfig } from './level-loader.js';

/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 */

const processedModuleIds = new Set(['1-abandoned-laboratory']);
let cachedLevelModuleEntriesPromise = null;
const modulePathRegistry = new Map();

export const registry = new Map();
export const loaderRegistry = new Map();

function deriveIdFromPath(path) {
  const segments = path.split('/');
  const filename = segments.pop() ?? '';
  if (filename === 'index.js') {
    return segments.pop() ?? 'index';
  }
  return filename.replace(/\.js$/, '');
}

async function getLevelModuleEntries() {
  if (cachedLevelModuleEntriesPromise) return cachedLevelModuleEntriesPromise;

  if (typeof import.meta?.glob === 'function') {
    const globEntries = {
      ...import.meta.glob('../data/levels/*.js'),
      ...import.meta.glob('../data/levels/**/index.js'),
    };
    const filtered = Object.entries(globEntries).filter(([path]) => !path.endsWith('/levels/index.js'));
    cachedLevelModuleEntriesPromise = Promise.resolve(filtered);
    return cachedLevelModuleEntriesPromise;
  }

  cachedLevelModuleEntriesPromise = (async () => {
    try {
      const { readdir } = await import('fs/promises');
      const directoryUrl = new URL('../data/levels/', import.meta.url);

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

  return cachedLevelModuleEntriesPromise;
}

function extractLevelPackage(moduleValue) {
  const candidate = moduleValue?.default ?? moduleValue;
  let config = candidate?.config ?? moduleValue?.config;

  if (!config && candidate?.meta) config = candidate;
  if (!config && moduleValue?.meta) config = moduleValue;
  if (!config && typeof candidate === 'object') {
    config = Object.values(candidate).find((value) => value?.meta);
  }

  const dialogues = candidate?.dialogues ?? moduleValue?.dialogues ?? candidate?.npcScripts;
  const quests = candidate?.quests ?? moduleValue?.quests ?? candidate?.questLines;

  return { config, dialogues, quests };
}

function validateLevelPackage(levelId, config) {
  const scripts = config.npcScripts ?? {};
  const rewards = config.rewards ?? {};
  const missingRewards = new Set();
  const missingDialogues = [];

  Object.values(scripts).forEach((script) => {
    (script?.lines ?? []).forEach((line) => {
      if (line.rewardId && !rewards[line.rewardId]) {
        missingRewards.add(line.rewardId);
      }
    });
  });

  (config.actors?.npcs ?? []).forEach((npc) => {
    const targetScriptId = npc.scriptId ?? npc.id;
    const hasScript = Boolean(targetScriptId && scripts[targetScriptId]);
    const hasDialogue = Boolean(npc.dialogue);
    const isHostileOnly = npc.lethal && !hasScript && !hasDialogue;
    if (!hasScript && !hasDialogue && !isHostileOnly) {
      missingDialogues.push(targetScriptId || npc.id || 'unknown-npc');
    }
  });

  if (missingRewards.size || missingDialogues.length) {
    const rewardMessage = missingRewards.size ? `Missing rewards: ${[...missingRewards].join(', ')}` : '';
    const dialogueMessage = missingDialogues.length
      ? `NPCs without dialogue or script: ${missingDialogues.join(', ')}`
      : '';
    const message = [`Level "${levelId}" failed validation.`, rewardMessage, dialogueMessage]
      .filter(Boolean)
      .join(' ');
    throw new Error(message);
  }
}

function registerLevelPackage(moduleValue, fallbackId) {
  const { config, dialogues, quests } = extractLevelPackage(moduleValue);
  if (!config) return null;

  const normalized = normalizeLevelConfig(config);
  const levelId = normalized.meta?.id ?? fallbackId ?? config?.meta?.id;
  const mergedConfig = {
    ...normalized,
    npcScripts: normalized.npcScripts ?? dialogues ?? {},
    quests: normalized.quests ?? quests ?? [],
  };

  validateLevelPackage(levelId, mergedConfig);
  registry.set(levelId, mergedConfig);
  return { levelId, config: mergedConfig };
}

function enrichLevelConfig(base, id) {
  return {
    ...base,
    meta: base.meta ?? { id },
    quests: base.quests ?? [],
    npcScripts: base.npcScripts ?? {},
  };
}

export function registerLevelLoader(id, loader) {
  loaderRegistry.set(id, loader);
}

export function registerLevelConfig(id, config, extras = {}) {
  return registerLevelPackage({ config, ...extras }, id);
}

export function registerLevelModule(id, modulePath) {
  modulePathRegistry.set(id, modulePath);
  registerLevelLoader(id, () => import(modulePath));
}

const defaultPackage = registerLevelPackage(defaultLevelModule, 'level-1') ?? {
  levelId: 'level-1',
  config: normalizeLevelConfig({ meta: { id: 'level-1' } }),
};
export const DEFAULT_LEVEL_ID = defaultPackage.levelId;
const defaultLevelConfig = defaultPackage.config;

registerLevelConfig(facilitySample.meta?.id ?? 'tiled-facility', facilitySample);
registerLevelModule('level-0-prologue', '../data/levels/0-prologue/index.js');
registerLevelModule('level-2', '../data/levels/2-northern-wing/index.js');
registerLevelModule('level-3', '../data/levels/3-rooftop-corridor/index.js');
registerLevelModule('level-4', '../data/levels/4-hospital/index.js');

function getLevelConfigSyncInternal(id) {
  const base = registry.get(id) ?? registry.get(DEFAULT_LEVEL_ID) ?? defaultLevelConfig;
  return enrichLevelConfig(base, id);
}

export function getLevelConfigSync(id = DEFAULT_LEVEL_ID) {
  return getLevelConfigSyncInternal(id);
}

async function loadLevelFromLoader(loader, fallbackId) {
  const loaded = await loader();
  const registered = registerLevelPackage(loaded, fallbackId);
  return registered?.config ?? null;
}

async function loadLevelModuleFromPath(modulePath, fallbackId, { cacheBust = false } = {}) {
  const url = new URL(modulePath, import.meta.url);
  if (cacheBust) {
    url.searchParams.set('t', Date.now().toString());
  }
  const loaded = await import(url.href);
  const registered = registerLevelPackage(loaded, fallbackId);
  return registered?.config ?? null;
}

async function importBundledLevel(id, { forceReload = false } = {}) {
  const entries = await getLevelModuleEntries();
  for (const [path, loader] of entries) {
    const moduleId = deriveIdFromPath(path);
    if (processedModuleIds.has(moduleId) && !(forceReload && moduleId === id)) continue;
    if (forceReload && moduleId === id) {
      const config = await loadLevelModuleFromPath(path, moduleId, { cacheBust: true });
      processedModuleIds.add(moduleId);
      if (config) return config;
    } else {
      const moduleValue = await loader();
      processedModuleIds.add(moduleId);

      const registered = registerLevelPackage(moduleValue, moduleId);
      if (registered?.levelId && !loaderRegistry.has(registered.levelId)) {
        registerLevelLoader(registered.levelId, () => loader());
      }
      if (registered?.levelId === id) return registered.config;
    }
  }
  return null;
}

export async function loadLevelConfig(id = DEFAULT_LEVEL_ID, { forceReload = false } = {}) {
  let base = forceReload ? null : registry.get(id);
  if (!base) {
    const modulePath = modulePathRegistry.get(id);
    if (modulePath) {
      base = await loadLevelModuleFromPath(modulePath, id, { cacheBust: forceReload });
    }
  }
  if (!base) {
    const loader = loaderRegistry.get(id);
    if (loader) {
      base = await loadLevelFromLoader(loader, id);
    }
  }

  if (!base) {
    base = await importBundledLevel(id, { forceReload });
  }

  if (!base) {
    base = getLevelConfigSyncInternal(DEFAULT_LEVEL_ID);
  }

  return enrichLevelConfig(base, id);
}

export function getLevelConfig(id = DEFAULT_LEVEL_ID) {
  return getLevelConfigSync(id);
}

export function getLevelMeta(config = getLevelConfigSync()) {
  return config.meta ?? { name: 'Unknown Sector' };
}

export function getActorPlacements(config = getLevelConfigSync()) {
  return JSON.parse(JSON.stringify(config.actors ?? {}));
}

export function getPickupTemplates(config = getLevelConfigSync()) {
  return config.pickups ?? [];
}

export function getObjectiveTotal(config = getLevelConfigSync()) {
  const questObjective = config.quests?.[0]?.objectiveCount;
  if (questObjective != null) return questObjective;
  return (config.pickups ?? []).filter((pickup) => pickup.objective !== false).length;
}

export function getNpcScripts(config = getLevelConfigSync()) {
  return config.npcScripts ?? {};
}

export function getRewards(config = getLevelConfigSync()) {
  return config.rewards ?? {};
}

export function getQuestConfigs(config = getLevelConfigSync()) {
  return config.quests ?? [];
}
