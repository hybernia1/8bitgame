import {
  getSlotIndexFromBinding,
  loadInputBindings,
  resolveActionForButton,
  resolveActionForKey,
  saveInputBindings,
} from '../core/input-bindings.js';
import { INPUT_ACTIONS } from '../core/input-actions.js';

function isTextInput(target) {
  const hasInput = typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement;
  const hasTextArea = typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement;
  if (hasInput || hasTextArea) return true;
  const tagName = target?.tagName?.toLowerCase?.();
  return tagName === 'input' || tagName === 'textarea' || target?.isContentEditable === true;
}

export function createInputSystem({ inventorySlots = 12, onAction } = {}) {
  let bindings = loadInputBindings();
  saveInputBindings(bindings);

  const listeners = new Set();
  if (onAction) {
    listeners.add(onAction);
  }

  let documentRoot = null;
  let windowRoot = null;
  let inventoryGrid = null;
  let gamepadFrame = null;
  let running = false;
  const buttonState = new Map();

  function emit(action, detail) {
    listeners.forEach((listener) => {
      listener?.(action, detail ?? {});
    });
  }

  function handleAction(action, detail) {
    if (!action) return;
    if (action === INPUT_ACTIONS.USE_SLOT) {
      const slotIndex = detail?.slotIndex;
      if (slotIndex == null || slotIndex < 0 || slotIndex >= inventorySlots) return;
      emit(action, { slotIndex });
      return;
    }
    emit(action, detail);
  }

  function onKeyDown(event) {
    if (!running) return;
    const action = resolveActionForKey(bindings, event.code);
    if (!action) return;

    if (isTextInput(event.target) && action !== INPUT_ACTIONS.TOGGLE_PAUSE) return;

    if (action === INPUT_ACTIONS.USE_SLOT) {
      const slotIndex = getSlotIndexFromBinding(bindings, event.code, 'keyboard');
      if (slotIndex >= 0) {
        handleAction(action, { slotIndex });
        event.preventDefault?.();
      }
      return;
    }

    handleAction(action);
    event.preventDefault?.();
  }

  function onInventoryClick(event) {
    if (!running) return;
    const slot = event.target?.closest?.('.inventory-slot');
    if (!slot) return;
    const index = Number.parseInt(slot.dataset.index, 10) - 1;
    if (Number.isInteger(index)) {
      handleAction(INPUT_ACTIONS.USE_SLOT, { slotIndex: index });
    }
  }

  function pollGamepads() {
    if (!running) return;
    const pads = (windowRoot ?? globalThis)?.navigator?.getGamepads?.();
    const active = pads?.find((pad) => pad && pad.connected);
    if (active) {
      active.buttons.forEach((button, index) => {
        const wasPressed = buttonState.get(index) === true;
        if (button.pressed && !wasPressed) {
          const action = resolveActionForButton(bindings, index);
          if (action === INPUT_ACTIONS.USE_SLOT) {
            const slotIndex = getSlotIndexFromBinding(bindings, index, 'gamepad');
            if (slotIndex >= 0) {
              handleAction(INPUT_ACTIONS.USE_SLOT, { slotIndex });
            }
          } else if (action) {
            handleAction(action);
          }
        }
        buttonState.set(index, button.pressed);
      });
    }
    const raf = windowRoot?.requestAnimationFrame ?? globalThis.requestAnimationFrame;
    if (running && typeof raf === 'function') {
      gamepadFrame = raf(pollGamepads);
    }
  }

  function startGamepadPolling() {
    if (!running || gamepadFrame) return;
    const raf = windowRoot?.requestAnimationFrame ?? globalThis.requestAnimationFrame;
    if (typeof raf !== 'function') return;
    gamepadFrame = raf(pollGamepads);
  }

  function stopGamepadPolling() {
    if (!gamepadFrame) return;
    const cancelRaf = windowRoot?.cancelAnimationFrame ?? globalThis.cancelAnimationFrame;
    if (typeof cancelRaf === 'function') {
      cancelRaf(gamepadFrame);
    }
    gamepadFrame = null;
  }

  function init(domRefs = {}) {
    documentRoot = domRefs.document ?? (typeof document !== 'undefined' ? document : null);
    windowRoot = domRefs.window ?? (typeof window !== 'undefined' ? window : null);
    inventoryGrid =
      domRefs.inventoryGrid ??
      documentRoot?.querySelector?.('.inventory-grid') ??
      null;

    documentRoot?.addEventListener?.('keydown', onKeyDown);
    inventoryGrid?.addEventListener?.('click', onInventoryClick);
    windowRoot?.addEventListener?.('gamepadconnected', startGamepadPolling);
    windowRoot?.addEventListener?.('gamepaddisconnected', stopGamepadPolling);
  }

  function destroy() {
    documentRoot?.removeEventListener?.('keydown', onKeyDown);
    inventoryGrid?.removeEventListener?.('click', onInventoryClick);
    windowRoot?.removeEventListener?.('gamepadconnected', startGamepadPolling);
    windowRoot?.removeEventListener?.('gamepaddisconnected', stopGamepadPolling);
    stopGamepadPolling();
    running = false;
    listeners.clear();
  }

  function start() {
    if (running) return;
    running = true;
    startGamepadPolling();
  }

  function stop() {
    if (!running) return;
    running = false;
    stopGamepadPolling();
    buttonState.clear();
  }

  function on(listener) {
    if (listener) {
      listeners.add(listener);
    }
    return () => listeners.delete(listener);
  }

  function updateBindings(nextBindings) {
    if (!nextBindings) return;
    saveInputBindings(nextBindings);
    bindings = loadInputBindings();
  }

  return {
    destroy,
    init,
    start,
    stop,
    onAction: on,
    getBindings: () => bindings,
    isRunning: () => running,
    getButtonState: () => new Map(buttonState),
    updateBindings,
  };
}
