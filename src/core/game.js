import { getLevelMeta, loadLevelConfig } from '../world/level-data.js';
import { LevelInstance } from '../world/level-instance.js';

const SAVE_VERSION = 3;
const saveMigrations = new Map();

export function createGame({ inventory, hudSystem } = {}) {
  const progress = {};
  const hooks = {
    returnToMenu: null,
    advanceToMap: null,
  };
  const storagePrefix = '8bitgame.save.';

  let currentLevelId = null;
  let currentLevel = null;
  let objectivesCollected = 0;
  let hud = hudSystem;
  let saveSlotId = null;
  let snapshotProvider = null;

  function getStorage() {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage;
    } catch {
      return null;
    }
  }

  function getStorageKey(slotId) {
    return `${storagePrefix}${slotId}`;
  }

  function setHud(nextHud) {
    hud = nextHud;
    syncHud();
  }

  function syncHud() {
    if (!hud || !currentLevel) return;
    const meta = getLevelMeta(currentLevel.config);
    hud.setLevelTitle?.(meta.title ?? meta.name ?? meta.id ?? 'Unknown Sector', meta.levelNumber ?? 0);
    hud.setSubtitle?.(meta.subtitle ?? '');
    hud.setObjectives?.(objectivesCollected, currentLevel.getObjectiveTotal?.());
  }

  async function loadLevel(id) {
    const config = await loadLevelConfig(id);
    currentLevel = new LevelInstance(config);
    currentLevelId = config.meta?.id ?? id ?? 'level';
    objectivesCollected = 0;
    syncHud();

    const saved = progress[currentLevelId];
    if (saved) {
      currentLevel.restoreState(saved.levelState);
      objectivesCollected = saved.objectivesCollected ?? 0;
      if (inventory && saved.inventory) {
        inventory.restore(saved.inventory);
      }
    }

    syncHud();
    return currentLevel;
  }

  function saveProgress({ manual = false, auto = false } = {}) {
    if (!currentLevelId) return null;
    const extraSnapshot = snapshotProvider?.() ?? {};
    const snapshot = {
      objectivesCollected,
      inventory: inventory?.serialize?.(),
      levelState: currentLevel?.serializeState?.(),
      playerState: extraSnapshot.playerState ?? null,
      playerVitals: extraSnapshot.playerVitals ?? null,
      projectiles: extraSnapshot.projectiles ?? [],
      pickups: extraSnapshot.pickups ?? [],
      npcs: extraSnapshot.npcs ?? [],
      sessionState: extraSnapshot.sessionState ?? null,
      persistentState: extraSnapshot.persistentState ?? null,
      savedAt: Date.now(),
    };
    progress[currentLevelId] = snapshot;

    if (saveSlotId) {
      const storage = getStorage();
      const payload = {
        slotId: saveSlotId,
        currentLevelId,
        savedAt: snapshot.savedAt,
        progress,
        version: SAVE_VERSION,
      };
      if (storage) {
        try {
          storage.setItem(getStorageKey(saveSlotId), JSON.stringify(payload));
          const toastId = manual ? 'note.save.manual' : 'note.save.auto';
          if (manual || auto) {
            hud?.showSaveToast?.(toastId, { slot: saveSlotId });
          }
        } catch (err) {
          console.error('Failed to persist save', err);
        }
      }
    }

    return snapshot;
  }

  function recordObjectives(count) {
    objectivesCollected = count;
    hud?.setObjectives?.(objectivesCollected, currentLevel?.getObjectiveTotal?.());
    saveProgress({ auto: true });
  }

  function onReturnToMenu(callback) {
    hooks.returnToMenu = callback;
  }

  function returnToMenu() {
    hooks.returnToMenu?.(currentLevelId);
  }

  function onAdvanceToMap(callback) {
    hooks.advanceToMap = callback;
  }

  async function advanceToNextMap(nextLevelId) {
    hooks.advanceToMap?.(nextLevelId ?? null);
    if (!hooks.advanceToMap && nextLevelId) {
      await loadLevel(nextLevelId);
    }
  }

  function setSaveSlot(slotId, { resetProgress = false } = {}) {
    saveSlotId = slotId || null;
    if (resetProgress) {
      currentLevel = null;
      currentLevelId = null;
      objectivesCollected = 0;
      Object.keys(progress).forEach((key) => delete progress[key]);
    }
  }

  function listSaves() {
    const storage = getStorage();
    if (!storage) return [];
    const saves = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key?.startsWith(storagePrefix)) continue;
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? '');
        if (parsed?.slotId) {
          saves.push(parsed);
        }
      } catch (err) {
        console.warn('Failed to parse save entry', err);
      }
    }
    return saves.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }

  const expectedSnapshotKeys = [
    'inventory',
    'levelState',
    'playerState',
    'playerVitals',
    'projectiles',
    'sessionState',
    'persistentState',
    'objectivesCollected',
    'savedAt',
    'pickups',
    'npcs',
  ];

  function addSnapshotDefaults(snapshot = {}) {
    const sessionState = snapshot?.sessionState ?? {};
    const persistentState =
      snapshot?.persistentState ?? {
        flags: sessionState?.flags ?? {},
        quests: sessionState?.quests ?? {},
        areaName: sessionState?.areaName,
        levelNumber: sessionState?.levelNumber,
        subtitle: sessionState?.subtitle,
      };

    return {
      ...snapshot,
      sessionState,
      persistentState,
      pickups: snapshot?.pickups ?? [],
      npcs: snapshot?.npcs ?? [],
      projectiles: snapshot?.projectiles ?? [],
    };
  }

  function addPersistentStateToProgress(progress = {}) {
    const upgraded = {};
    Object.entries(progress).forEach(([levelId, snapshot]) => {
      upgraded[levelId] = addSnapshotDefaults(snapshot);
    });
    return upgraded;
  }

  saveMigrations.set(0, (payload) => ({
    ...payload,
    progress: addPersistentStateToProgress(payload?.progress ?? {}),
    version: SAVE_VERSION,
  }));
  saveMigrations.set(1, (payload) => ({
    ...payload,
    progress: addPersistentStateToProgress(payload?.progress ?? {}),
    version: SAVE_VERSION,
  }));
  saveMigrations.set(2, (payload) => ({
    ...payload,
    progress: addPersistentStateToProgress(payload?.progress ?? {}),
    version: SAVE_VERSION,
  }));
  saveMigrations.set(SAVE_VERSION, (payload) => payload);

  function isValidSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    return expectedSnapshotKeys.every((key) => Object.prototype.hasOwnProperty.call(snapshot, key));
  }

  function isValidPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.progress || typeof payload.progress !== 'object') return false;
    return Object.values(payload.progress).every((entry) => isValidSnapshot(entry));
  }

  function applyMigrations(payload) {
    let migrated = payload;
    let currentVersion = migrated?.version ?? 0;
    const visited = new Set();
    while (currentVersion < SAVE_VERSION) {
      if (visited.has(currentVersion)) return null;
      visited.add(currentVersion);
      const migrator = saveMigrations.get(currentVersion);
      if (!migrator) {
        return null;
      }
      migrated = migrator(migrated) ?? migrated;
      currentVersion = migrated.version ?? currentVersion + 1;
    }
    return currentVersion === SAVE_VERSION ? migrated : null;
  }

  function resetCorruptedSlot(slotId, message, error) {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
    hud?.showToast?.(message);
    deleteSave(slotId);
    setSaveSlot(slotId, { resetProgress: true });
    return null;
  }

  function loadFromSlot(slotId) {
    if (!slotId) return null;
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(getStorageKey(slotId));
    if (!raw) return null;
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return resetCorruptedSlot(
        slotId,
        'Uložená data jsou poškozená a byla vymazána. (neplatný JSON)',
        err,
      );
    }

    const migrated = applyMigrations(parsed);
    if (!migrated) {
      return resetCorruptedSlot(
        slotId,
        'Uložená data nesedí k aktuální verzi. Slot byl resetován.',
      );
    }

    if (!isValidPayload(migrated)) {
      return resetCorruptedSlot(
        slotId,
        'Uložená data postrádají očekávané části. Slot byl resetován.',
      );
    }

    Object.values(migrated.progress).forEach((snapshot) => {
      if (!snapshot.sessionState) {
        snapshot.sessionState = {};
      }
      snapshot.sessionState.dialogueTime = 0;
      snapshot.sessionState.activeSpeaker = '';
      snapshot.sessionState.activeLine = '';
      snapshot.sessionState.levelAdvanceQueued = false;
    });

    Object.keys(progress).forEach((key) => delete progress[key]);
    Object.assign(progress, migrated.progress);
    currentLevelId = migrated.currentLevelId ?? null;
    saveSlotId = migrated.slotId ?? slotId;

    if (migrated.version !== parsed.version) {
      try {
        storage.setItem(getStorageKey(saveSlotId), JSON.stringify(migrated));
      } catch (err) {
        console.warn('Failed to persist migrated save', err);
      }
    }

    return migrated;
  }

  function deleteSave(slotId) {
    if (!slotId) return;
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(getStorageKey(slotId));
    } catch (err) {
      console.error('Failed to delete save', err);
    }
  }

  function getSavedSnapshot(levelId = currentLevelId) {
    if (!levelId) return null;
    return progress[levelId] ?? null;
  }

  function setSnapshotProvider(provider) {
    snapshotProvider = provider;
  }

  return {
    loadLevel,
    saveProgress,
    recordObjectives,
    setHud,
    setSaveSlot,
    get saveSlotId() {
      return saveSlotId;
    },
    onReturnToMenu,
    onAdvanceToMap,
    returnToMenu,
    advanceToNextMap,
    listSaves,
    loadFromSlot,
    deleteSave,
    getSavedSnapshot,
    setSnapshotProvider,
    get currentLevelId() {
      return currentLevelId;
    },
    get currentLevel() {
      return currentLevel;
    },
    get objectivesCollected() {
      return objectivesCollected;
    },
  };
}
