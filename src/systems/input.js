import {
  getSlotIndexFromBinding,
  loadInputBindings,
  resolveActionForButton,
  resolveActionForKey,
  saveInputBindings,
} from '../core/input-bindings.js';

function isTextInput(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable === true
  );
}

export function createInputSystem({ inventorySlots = 6, onAction } = {}) {
  let bindings = loadInputBindings();
  saveInputBindings(bindings);

  const listeners = new Set();
  if (onAction) {
    listeners.add(onAction);
  }

  function emit(action, detail) {
    listeners.forEach((listener) => {
      listener?.(action, detail ?? {});
    });
  }

  function handleAction(action, detail) {
    if (!action) return;
    if (action === 'use-slot') {
      const slotIndex = detail?.slotIndex;
      if (slotIndex == null || slotIndex < 0 || slotIndex >= inventorySlots) return;
      emit(action, { slotIndex });
      return;
    }
    emit(action, detail);
  }

  function onKeyDown(event) {
    const action = resolveActionForKey(bindings, event.code);
    if (!action) return;

    if (isTextInput(event.target) && action !== 'toggle-pause') return;

    if (action === 'use-slot') {
      const slotIndex = getSlotIndexFromBinding(bindings, event.code, 'keyboard');
      if (slotIndex >= 0) {
        handleAction(action, { slotIndex });
        event.preventDefault();
      }
      return;
    }

    handleAction(action);
    event.preventDefault();
  }

  function onInventoryClick(event) {
    const slot = event.target.closest('.inventory-slot');
    if (!slot) return;
    const index = Number.parseInt(slot.dataset.index, 10) - 1;
    if (Number.isInteger(index)) {
      handleAction('use-slot', { slotIndex: index });
    }
  }

  let gamepadFrame = null;
  const buttonState = new Map();

  function pollGamepads() {
    const pads = navigator.getGamepads?.();
    const active = pads?.find((pad) => pad && pad.connected);
    if (active) {
      active.buttons.forEach((button, index) => {
        const wasPressed = buttonState.get(index) === true;
        if (button.pressed && !wasPressed) {
          const action = resolveActionForButton(bindings, index);
          if (action === 'use-slot') {
            const slotIndex = getSlotIndexFromBinding(bindings, index, 'gamepad');
            if (slotIndex >= 0) {
              handleAction('use-slot', { slotIndex });
            }
          } else if (action) {
            handleAction(action);
          }
        }
        buttonState.set(index, button.pressed);
      });
    }
    gamepadFrame = requestAnimationFrame(pollGamepads);
  }

  function startGamepadPolling() {
    if (typeof navigator === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
    if (gamepadFrame) return;
    gamepadFrame = requestAnimationFrame(pollGamepads);
  }

  function stopGamepadPolling() {
    if (!gamepadFrame || typeof cancelAnimationFrame === 'undefined') return;
    cancelAnimationFrame(gamepadFrame);
    gamepadFrame = null;
  }

  document.addEventListener('keydown', onKeyDown);
  document.querySelector('.inventory-grid')?.addEventListener('click', onInventoryClick);
  window.addEventListener('gamepadconnected', startGamepadPolling);
  window.addEventListener('gamepaddisconnected', stopGamepadPolling);
  startGamepadPolling();

  function destroy() {
    document.removeEventListener('keydown', onKeyDown);
    document.querySelector('.inventory-grid')?.removeEventListener('click', onInventoryClick);
    window.removeEventListener('gamepadconnected', startGamepadPolling);
    window.removeEventListener('gamepaddisconnected', stopGamepadPolling);
    stopGamepadPolling();
    listeners.clear();
  }

  function on(listener) {
    if (listener) {
      listeners.add(listener);
    }
    return () => listeners.delete(listener);
  }

  function updateBindings(nextBindings) {
    if (!nextBindings) return;
    bindings = nextBindings;
    saveInputBindings(bindings);
  }

  return {
    destroy,
    onAction: on,
    getBindings: () => bindings,
    updateBindings,
  };
}
