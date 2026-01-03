import { demoLevelDialogues } from './demoLevel.js';

const dialogueRegistry = {
  'demo-facility': demoLevelDialogues,
  'level-1': {},
};

export function getDialoguesForLevel(levelId) {
  return dialogueRegistry[levelId] ?? {};
}
