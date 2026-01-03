import { demoLevelDialogues } from './demoLevel.js';

const dialogueRegistry = {
  'demo-facility': demoLevelDialogues,
};

export function getDialoguesForLevel(levelId) {
  return dialogueRegistry[levelId] ?? {};
}
