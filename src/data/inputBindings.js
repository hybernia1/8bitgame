const inputBindings = {
  keyboard: {
    interact: ['KeyE'],
    shoot: ['Space'],
    'toggle-pause': ['KeyP'],
    'toggle-inventory': ['KeyB'],
    'toggle-quest-log': ['KeyI'],
    'use-slot': [
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
    interact: [0],
    shoot: [1],
    'toggle-pause': [9],
    'toggle-inventory': [2],
    'toggle-quest-log': [3],
  },
};

export default inputBindings;
