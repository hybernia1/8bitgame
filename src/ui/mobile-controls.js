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
  const touchpad = controls.querySelector?.('[data-mobile-touchpad]') ?? null;
  const dispatchTarget = root.dispatchEvent ? root : root.ownerDocument ?? document;
  const activeKeys = new Set();
  const activeMovement = new Set();
  let touchpadPointer = null;

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
    activeMovement.forEach((code) => dispatchKey('keyup', code));
    activeMovement.clear();
    buttons.forEach((button) => button.classList.remove('is-pressed'));
    touchpadPointer = null;
  };

  const setMovementKeys = (nextKeys = []) => {
    const nextSet = new Set(nextKeys);
    activeMovement.forEach((code) => {
      if (!nextSet.has(code)) {
        dispatchKey('keyup', code);
        activeMovement.delete(code);
      }
    });
    nextSet.forEach((code) => {
      if (!activeMovement.has(code)) {
        dispatchKey('keydown', code);
        activeMovement.add(code);
      }
    });
  };

  const getMovementKeys = (event) => {
    if (!touchpad) return [];
    const rect = touchpad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const thresholdX = rect.width * 0.18;
    const thresholdY = rect.height * 0.18;
    const keys = [];
    if (Math.abs(dx) > thresholdX) {
      keys.push(dx > 0 ? 'KeyD' : 'KeyA');
    }
    if (Math.abs(dy) > thresholdY) {
      keys.push(dy > 0 ? 'KeyS' : 'KeyW');
    }
    return keys;
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

  if (touchpad) {
    const handleTouchpadDown = (event) => {
      event.preventDefault();
      touchpadPointer = event.pointerId ?? 'touchpad';
      touchpad?.setPointerCapture?.(event.pointerId);
      setMovementKeys(getMovementKeys(event));
    };

    const handleTouchpadMove = (event) => {
      if (touchpadPointer == null) return;
      if (event.pointerId != null && event.pointerId !== touchpadPointer) return;
      event.preventDefault();
      setMovementKeys(getMovementKeys(event));
    };

    const handleTouchpadUp = (event) => {
      if (event.pointerId != null && event.pointerId !== touchpadPointer) return;
      event.preventDefault();
      setMovementKeys([]);
      touchpadPointer = null;
      touchpad?.releasePointerCapture?.(event.pointerId);
    };

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      bindListener(touchpad, 'pointerdown', handleTouchpadDown);
      bindListener(touchpad, 'pointermove', handleTouchpadMove);
      bindListener(touchpad, 'pointerup', handleTouchpadUp);
      bindListener(touchpad, 'pointercancel', handleTouchpadUp);
      bindListener(touchpad, 'pointerleave', handleTouchpadUp);
    } else {
      const handleMouseDown = (event) => {
        event.preventDefault();
        touchpadPointer = 'mouse';
        setMovementKeys(getMovementKeys(event));
      };
      const handleMouseMove = (event) => {
        if (touchpadPointer !== 'mouse') return;
        event.preventDefault();
        setMovementKeys(getMovementKeys(event));
      };
      const handleMouseUp = (event) => {
        if (touchpadPointer !== 'mouse') return;
        event.preventDefault();
        touchpadPointer = null;
        setMovementKeys([]);
      };
      const handleTouchStart = (event) => {
        event.preventDefault();
        touchpadPointer = 'touch';
        setMovementKeys(getMovementKeys(event.touches[0] ?? event));
      };
      const handleTouchMove = (event) => {
        if (touchpadPointer !== 'touch') return;
        event.preventDefault();
        setMovementKeys(getMovementKeys(event.touches[0] ?? event));
      };
      const handleTouchEnd = (event) => {
        if (touchpadPointer !== 'touch') return;
        event.preventDefault();
        touchpadPointer = null;
        setMovementKeys([]);
      };

      bindListener(touchpad, 'mousedown', handleMouseDown);
      bindListener(touchpad, 'mousemove', handleMouseMove);
      bindListener(touchpad, 'mouseup', handleMouseUp);
      bindListener(touchpad, 'mouseleave', handleMouseUp);
      bindListener(touchpad, 'touchstart', handleTouchStart, { passive: false });
      bindListener(touchpad, 'touchmove', handleTouchMove, { passive: false });
      bindListener(touchpad, 'touchend', handleTouchEnd);
      bindListener(touchpad, 'touchcancel', handleTouchEnd);
    }
  }

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
