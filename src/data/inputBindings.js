import { INPUT_ACTIONS } from '../core/input-actions.js';

const inputBindings = {
  keyboard: {
    [INPUT_ACTIONS.INTERACT]: ['KeyE'],
    [INPUT_ACTIONS.SHOOT]: ['Space'],
    [INPUT_ACTIONS.TOGGLE_PAUSE]: ['KeyP'],
    [INPUT_ACTIONS.TOGGLE_INVENTORY]: ['KeyB'],
    [INPUT_ACTIONS.TOGGLE_QUEST_LOG]: ['KeyI'],
    [INPUT_ACTIONS.USE_SLOT]: [
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Digit7',
      'Digit8',
      'Digit9',
      'Digit0',
      'Minus',
      'Equal',
    ],
  },
  gamepad: {
    [INPUT_ACTIONS.INTERACT]: [0],
    [INPUT_ACTIONS.SHOOT]: [1],
    [INPUT_ACTIONS.TOGGLE_PAUSE]: [9],
    [INPUT_ACTIONS.TOGGLE_INVENTORY]: [2],
    [INPUT_ACTIONS.TOGGLE_QUEST_LOG]: [3],
  },
};

export default inputBindings;
