import { demoLevel } from '../data/demoLevel.js';

export const DEFAULT_LEVEL_ID = demoLevel.meta?.id ?? 'demo-level';
const registry = {
  [DEFAULT_LEVEL_ID]: demoLevel,
};

export function getLevelConfig(id = DEFAULT_LEVEL_ID) {
  return registry[id] ?? demoLevel;
}

export function getLevelMeta(config = getLevelConfig()) {
  return config.meta ?? { name: 'Unknown Sector' };
}

export function getActorPlacements(config = getLevelConfig()) {
  return JSON.parse(JSON.stringify(config.actors ?? {}));
}

export function getPickupTemplates(config = getLevelConfig()) {
  return config.pickups ?? [];
}

export function getObjectiveTotal(config = getLevelConfig()) {
  const questObjective = config.quests?.[0]?.objectiveCount;
  if (questObjective != null) return questObjective;
  return (config.pickups ?? []).filter((pickup) => pickup.objective !== false).length;
}

export function getNpcScripts(config = getLevelConfig()) {
  return config.npcScripts ?? {};
}

export function getRewards(config = getLevelConfig()) {
  return config.rewards ?? {};
}

export function getQuestConfigs(config = getLevelConfig()) {
  return config.quests ?? [];
}
