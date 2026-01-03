import { demoLevelQuests } from './demoLevel.js';

const questRegistry = {
  'demo-facility': demoLevelQuests,
  'level-1': [],
};

export function getQuestsForLevel(levelId) {
  return questRegistry[levelId] ?? [];
}
