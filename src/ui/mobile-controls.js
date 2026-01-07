const KEY_LABELS = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyE: 'e',
  KeyB: 'b',
  KeyI: 'i',
  KeyP: 'p',
  Space: ' ',
};

function createKeyEvent(type, code) {
  const key = KEY_LABELS[code] ?? code.replace('Key', '').toLowerCase();
  return new KeyboardEvent(type, {
    code,
    key,
    bubbles: true,
  });
}

export function initMobileControls({ root = document } = {}) {
  if (!root) {
    return { destroy() {} };
  }

  const controls = root.querySelector?.('[data-mobile-controls]') ?? null;
  if (!controls) {
    return { destroy() {} };
  }

  const buttons = Array.from(controls.querySelectorAll('[data-control-key]'));
  const dispatchTarget = root.dispatchEvent ? root : root.ownerDocument ?? document;
  const activeKeys = new Set();

  const dispatchKey = (type, code) => {
    dispatchTarget.dispatchEvent(createKeyEvent(type, code));
  };

  const pressKey = (code, button) => {
    if (activeKeys.has(code)) return;
    activeKeys.add(code);
    dispatchKey('keydown', code);
    button?.classList?.add('is-pressed');
  };

  const releaseKey = (code, button) => {
    if (!activeKeys.has(code)) return;
    activeKeys.delete(code);
    dispatchKey('keyup', code);
    button?.classList?.remove('is-pressed');
  };

  const releaseAll = () => {
    activeKeys.forEach((code) => dispatchKey('keyup', code));
    activeKeys.clear();
    buttons.forEach((button) => button.classList.remove('is-pressed'));
  };

  const listeners = [];

  const bindListener = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    listeners.push({ target, event, handler, options });
  };

  const handlePointerDown = (button, code) => (event) => {
    event.preventDefault();
    button?.setPointerCapture?.(event.pointerId);
    pressKey(code, button);
  };

  const handlePointerUp = (button, code) => (event) => {
    event.preventDefault();
    releaseKey(code, button);
    button?.releasePointerCapture?.(event.pointerId);
  };

  const handlePointerLeave = (button, code) => (event) => {
    if (event.pointerType === 'mouse') return;
    releaseKey(code, button);
    button?.releasePointerCapture?.(event.pointerId);
  };

  const handleMouseDown = (button, code) => (event) => {
    event.preventDefault();
    pressKey(code, button);
  };

  const handleMouseUp = (button, code) => (event) => {
    event.preventDefault();
    releaseKey(code, button);
  };

  const handleTouchStart = (button, code) => (event) => {
    event.preventDefault();
    pressKey(code, button);
  };

  const handleTouchEnd = (button, code) => (event) => {
    event.preventDefault();
    releaseKey(code, button);
  };

  buttons.forEach((button) => {
    const code = button.dataset.controlKey;
    if (!code) return;

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      bindListener(button, 'pointerdown', handlePointerDown(button, code));
      bindListener(button, 'pointerup', handlePointerUp(button, code));
      bindListener(button, 'pointercancel', handlePointerUp(button, code));
      bindListener(button, 'pointerleave', handlePointerLeave(button, code));
    } else {
      bindListener(button, 'mousedown', handleMouseDown(button, code));
      bindListener(button, 'mouseup', handleMouseUp(button, code));
      bindListener(button, 'mouseleave', handleMouseUp(button, code));
      bindListener(button, 'touchstart', handleTouchStart(button, code), { passive: false });
      bindListener(button, 'touchend', handleTouchEnd(button, code));
      bindListener(button, 'touchcancel', handleTouchEnd(button, code));
    }
  });

  const visibilityHandler = () => releaseAll();

  bindListener(window, 'blur', visibilityHandler);
  bindListener(document, 'visibilitychange', () => {
    if (document.hidden) releaseAll();
  });

  return {
    destroy() {
      listeners.forEach(({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options);
      });
      releaseAll();
    },
  };
}
