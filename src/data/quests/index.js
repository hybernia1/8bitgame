import { demoLevelQuests } from './demoLevel.js';

const questRegistry = {
  'level-1': demoLevelQuests,
  'level-2': [],
  'level-3': [],
};

export function getQuestsForLevel(levelId) {
  return questRegistry[levelId] ?? [];
}
