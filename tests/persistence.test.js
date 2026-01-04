import assert from 'node:assert/strict';
import test, { after, afterEach } from 'node:test';

import { createGame } from '../src/core/game.js';
import { DEFAULT_LEVEL_ID } from '../src/world/level-data.js';

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
  };
}

function createInventoryStub() {
  return {
    slots: [],
    serialize: () => ({ items: [] }),
    restore() {},
  };
}

const originalLocalStorage = globalThis.localStorage;
const storageMock = createLocalStorageMock();
globalThis.localStorage = storageMock;

afterEach(() => {
  storageMock.clear();
});

test('reload keeps persistent quest progress but clears transient session dialogue', async () => {
  const slotId = 'slot-1';
  const inventory = createInventoryStub();
  const game = createGame({ inventory });

  await game.loadLevel(DEFAULT_LEVEL_ID);
  game.setSaveSlot(slotId);
  game.setSnapshotProvider(() => ({
    playerState: null,
    playerVitals: null,
    projectiles: [],
    persistentState: {
      flags: { questAccepted: true },
      quests: {
        q1: { id: 'q1', completed: false, progress: { current: 2, total: 3 } },
      },
    },
    sessionState: {
      dialogueTime: 5,
      activeSpeaker: 'npc.guard',
      activeLine: 'dialogue.guard',
      levelAdvanceQueued: true,
    },
  }));

  game.saveProgress({ manual: true });

  const reloadedGame = createGame({ inventory: createInventoryStub() });
  reloadedGame.loadFromSlot(slotId);
  await reloadedGame.loadLevel(DEFAULT_LEVEL_ID);
  const snapshot = reloadedGame.getSavedSnapshot(reloadedGame.currentLevelId);

  assert.equal(snapshot.persistentState.flags.questAccepted, true);
  assert.deepEqual(snapshot.persistentState.quests.q1.progress, { current: 2, total: 3 });
  assert.equal(snapshot.sessionState.dialogueTime, 0);
  assert.equal(snapshot.sessionState.activeSpeaker, '');
  assert.equal(snapshot.sessionState.activeLine, '');
  assert.equal(snapshot.sessionState.levelAdvanceQueued, false);
});

after(() => {
  globalThis.localStorage = originalLocalStorage;
});
