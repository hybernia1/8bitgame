import { demoLevelDialogues } from './demoLevel.js';

const dialogueRegistry = {
  'level-1': demoLevelDialogues,
  'level-2': {},
};

export function getDialoguesForLevel(levelId) {
  return dialogueRegistry[levelId] ?? {};
}
