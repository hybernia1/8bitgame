import defaultBindings from '../data/inputBindings.js';
import { GAMEPAD_ACTIONS, INPUT_ACTIONS, KEYBOARD_ACTIONS } from './input-actions.js';
import { getStorageSafely } from './storage.js';

const STORAGE_KEY = '8bitgame.inputBindings';

const keyLabels = {
  Space: 'Mezerník',
  Escape: 'Esc',
  Tab: 'Tab',
  Minus: '-',
  Equal: '=',
};

const gamepadLabels = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Select',
  9: 'Start',
  10: 'L3',
  11: 'R3',
};

function uniq(values = []) {
  return Array.from(new Set(values));
}

function sanitizeBindings(bindings = {}) {
  const allowedKeyboard = defaultBindings.keyboard;
  const allowedGamepad = defaultBindings.gamepad;

  const sanitizeList = (list, allowed) => {
    if (!Array.isArray(list)) return [...allowed];
    const filtered = list.filter((value) => allowed.includes(value));
    return filtered.length ? uniq(filtered) : [...allowed];
  };

  const sanitizeDevice = (actions, deviceBindings, allowedBindings) =>
    actions.reduce(
      (acc, action) => ({
        ...acc,
        [action]: sanitizeList(deviceBindings?.[action], allowedBindings?.[action] ?? []),
      }),
      {},
    );

  return {
    keyboard: sanitizeDevice(KEYBOARD_ACTIONS, bindings.keyboard, allowedKeyboard),
    gamepad: sanitizeDevice(GAMEPAD_ACTIONS, bindings.gamepad, allowedGamepad),
  };
}

export function loadInputBindings() {
  const storage = getStorageSafely();
  if (!storage) return sanitizeBindings(defaultBindings);

  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return sanitizeBindings(stored);
    }
  } catch (error) {
    console.warn('Failed to parse stored input bindings', error);
  }

  return sanitizeBindings(defaultBindings);
}

export function saveInputBindings(bindings) {
  const storage = getStorageSafely();
  if (!storage) return;
  const sanitized = sanitizeBindings(bindings);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Failed to save input bindings', error);
  }
}

export function formatKeyLabel(code) {
  if (keyLabels[code]) return keyLabels[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export function formatGamepadLabel(buttonIndex) {
  if (gamepadLabels[buttonIndex] !== undefined) return gamepadLabels[buttonIndex];
  return `Button ${buttonIndex}`;
}

export function formatBinding(bindingConfig, action) {
  const keyboardLabels = (bindingConfig.keyboard?.[action] ?? []).map(formatKeyLabel);
  const gamepadLabels = (bindingConfig.gamepad?.[action] ?? []).map(formatGamepadLabel);
  return [...keyboardLabels, ...gamepadLabels].filter(Boolean).join(' / ');
}

export function formatControlsHint(bindingConfig) {
  return {
    interact: formatBinding(bindingConfig, INPUT_ACTIONS.INTERACT),
    shoot: formatBinding(bindingConfig, INPUT_ACTIONS.SHOOT),
    inventory: formatBinding(bindingConfig, INPUT_ACTIONS.TOGGLE_INVENTORY),
    pause: formatBinding(bindingConfig, INPUT_ACTIONS.TOGGLE_PAUSE),
  };
}

export function getSlotIndexFromBinding(bindingConfig, code, device = 'keyboard') {
  const bindings = bindingConfig?.[device]?.[INPUT_ACTIONS.USE_SLOT];
  if (!Array.isArray(bindings)) return -1;
  return bindings.findIndex((bindingCode) => bindingCode === code);
}

export function resolveActionForKey(bindingConfig, code) {
  const map = bindingConfig.keyboard ?? {};
  for (const [action, codes] of Object.entries(map)) {
    if (Array.isArray(codes) && codes.includes(code)) {
      return action;
    }
  }
  return null;
}

export function resolveActionForButton(bindingConfig, buttonIndex) {
  const map = bindingConfig.gamepad ?? {};
  for (const [action, buttons] of Object.entries(map)) {
    if (Array.isArray(buttons) && buttons.includes(buttonIndex)) {
      return action;
    }
  }
  return null;
}
