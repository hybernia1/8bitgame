import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createHudSystem } from '../src/systems/hud.js';
import { createInputSystem } from '../src/systems/input.js';

function createStubElement() {
  return {
    textContent: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
  };
}

function createMockEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      const current = listeners.get(type);
      if (!current) return;
      if (!handler || current === handler) {
        listeners.delete(type);
      }
    },
    dispatch(type, event) {
      listeners.get(type)?.(event);
    },
  };
}

describe('systems smoke tests', () => {
  it('initializes HUD system with provided nodes and without DOM', () => {
    const hudElements = {
      hudTitle: createStubElement(),
      hudSubtitle: createStubElement(),
      toast: createStubElement(),
      banner: createStubElement(),
      bannerTitle: createStubElement(),
      bannerBody: createStubElement(),
      ammoEl: createStubElement(),
      ammoCurrentEl: createStubElement(),
    };

    const hud = createHudSystem(hudElements);
    hud.setLevelTitle('Sektor', 3);
    assert.equal(hudElements.hudTitle.textContent, 'Level 3: Sektor');

    hud.setSubtitle('Custom subtitle');
    assert.equal(hudElements.hudSubtitle.textContent, 'Custom subtitle');

    hud.showPrompt('prompt.talk', { name: 'NPC' });
    assert.equal(hudElements.banner.dataset.state, 'prompt');
    assert.equal(hudElements.bannerBody.textContent, 'Stiskni E pro rozhovor s NPC');
    hud.hideInteraction();
    assert.equal(hudElements.banner.dataset.state, 'hidden');

    hud.setAmmo(5, 10);
    assert.equal(hudElements.ammoCurrentEl.textContent, '5/10');
    assert.equal(hudElements.ammoEl.attributes['aria-label'], 'Stav nábojů: 5 z 10');

    const hudWithoutDom = createHudSystem();
    assert.doesNotThrow(() => {
      hudWithoutDom.setHealth(1, 2);
      hudWithoutDom.setAmmo(0, 0);
      hudWithoutDom.setControlsHint();
      hudWithoutDom.showToast('note.inventory.intro');
      hudWithoutDom.hideToast();
    });
  });

  it('initializes input system with mock DOM references', () => {
    const doc = createMockEventTarget();
    const windowMock = createMockEventTarget();
    let scheduledFrame = null;
    const gamepads = [{ connected: true, buttons: [{ pressed: true }] }];
    windowMock.navigator = { getGamepads: () => gamepads };
    windowMock.requestAnimationFrame = (cb) => {
      scheduledFrame = cb;
      return 1;
    };
    windowMock.cancelAnimationFrame = () => {
      scheduledFrame = null;
    };
    const inventoryGrid = createMockEventTarget();

    const actions = [];
    const input = createInputSystem({
      inventorySlots: 2,
      onAction: (action, detail) => actions.push({ action, detail }),
    });
    input.init({
      document: doc,
      window: windowMock,
      inventoryGrid,
    });
    input.start();

    let prevented = false;
    doc.dispatch('keydown', {
      code: 'Digit1',
      target: {},
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.deepEqual(actions.shift(), { action: 'use-slot', detail: { slotIndex: 0 } });
    assert.equal(prevented, true);

    inventoryGrid.dispatch('click', {
      target: {
        closest: () => ({ dataset: { index: '2' } }),
      },
    });
    assert.deepEqual(actions.shift(), { action: 'use-slot', detail: { slotIndex: 1 } });

    scheduledFrame?.();
    assert.equal(input.getButtonState().get(0), true);
    assert.equal(actions.shift()?.action, 'interact');

    input.stop();
    doc.dispatch('keydown', { code: 'KeyE', target: {} });
    assert.equal(actions.length, 0);
    assert.equal(input.isRunning(), false);
    assert.equal(input.getButtonState().size, 0);

    gamepads[0].buttons[0].pressed = false;
    scheduledFrame?.();
    assert.equal(input.getButtonState().size, 0);

    input.destroy();
    doc.dispatch('keydown', { code: 'KeyE', target: {} });
    assert.equal(actions.length, 0);
  });
});
