import { demoLevelQuests } from './demoLevel.js';

const questRegistry = {
  'demo-facility': demoLevelQuests,
};

export function getQuestsForLevel(levelId) {
  return questRegistry[levelId] ?? [];
}
