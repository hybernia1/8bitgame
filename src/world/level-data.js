import { demoLevel } from '../data/demoLevel.js';
import { getDialoguesForLevel } from '../data/dialogues/index.js';
import { getQuestsForLevel } from '../data/quests/index.js';
import { normalizeLevelConfig } from './level-loader.js';

/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 */

export const registry = new Map();
export const loaderRegistry = new Map();

const demoId = demoLevel.meta?.id ?? 'demo-level';
export const DEFAULT_LEVEL_ID = demoId;

function enrichLevelConfig(base, id) {
  const levelId = base.meta?.id ?? id;
  return {
    ...base,
    quests: base.quests ?? getQuestsForLevel(levelId),
    npcScripts: base.npcScripts ?? getDialoguesForLevel(levelId),
  };
}

export function registerLevelConfig(id, config) {
  const normalized = normalizeLevelConfig(config);
  const levelId = normalized.meta?.id ?? id;
  registry.set(levelId, normalized);
}

export function registerLevelLoader(id, loader) {
  loaderRegistry.set(id, loader);
}

export function registerLevelModule(id, modulePath) {
  registerLevelLoader(id, () => import(modulePath));
}

registerLevelConfig(demoId, demoLevel);

export function getLevelConfigSync(id = DEFAULT_LEVEL_ID) {
  const base = registry.get(id) ?? registry.get(DEFAULT_LEVEL_ID) ?? normalizeLevelConfig(demoLevel);
  return enrichLevelConfig(base, id);
}

export async function loadLevelConfig(id = DEFAULT_LEVEL_ID) {
  let base = registry.get(id);
  if (!base) {
    const loader = loaderRegistry.get(id);
    if (loader) {
      const loaded = await loader();
      const normalized = normalizeLevelConfig(loaded);
      const levelId = normalized.meta?.id ?? id;
      registry.set(levelId, normalized);
      base = normalized;
    }
  }

  if (!base) {
    base = registry.get(DEFAULT_LEVEL_ID) ?? normalizeLevelConfig(demoLevel);
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
