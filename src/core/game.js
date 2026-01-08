import { getLevelMeta, loadLevelConfig } from '../world/level-data.js';
import { LevelInstance } from '../world/level-instance.js';
import { getStorageSafely } from './storage.js';

const SAVE_VERSION = 4;
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
      safes: extraSnapshot.safes ?? [],
      sessionState: extraSnapshot.sessionState ?? null,
      persistentState: extraSnapshot.persistentState ?? null,
      savedAt: Date.now(),
    };
    progress[currentLevelId] = snapshot;

    if (saveSlotId) {
      const storage = getStorageSafely();
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
    const storage = getStorageSafely();
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
    'safes',
  ];

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeArrayOfObjects(value, label, issues) {
    if (!Array.isArray(value)) {
      issues.push(`${label} nejsou pole`);
      return [];
    }
    const filtered = value.filter((entry) => isPlainObject(entry));
    if (filtered.length !== value.length) {
      issues.push(`${label} obsahují neplatné položky`);
    }
    return filtered;
  }

  function sanitizeNumber(value, fallback, label, issues) {
    if (!Number.isFinite(value)) {
      issues.push(`${label} nejsou číslo`);
      return fallback;
    }
    return value;
  }

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
      safes: snapshot?.safes ?? [],
    };
  }

  function sanitizeInventory(value, issues) {
    if (value == null) return null;
    if (!Array.isArray(value)) {
      issues.push('inventory nejsou pole');
      return null;
    }
    const normalized = value.map((slot) => (isPlainObject(slot) ? slot : null));
    const invalidSlots = value.filter((slot) => slot != null && !isPlainObject(slot)).length;
    if (invalidSlots) {
      issues.push('inventory obsahuje neplatné položky');
    }
    return normalized;
  }

  function sanitizeSnapshot(snapshot, levelId) {
    const issues = [];
    const sanitized = {
      ...snapshot,
      inventory: sanitizeInventory(snapshot.inventory, issues),
      levelState: isPlainObject(snapshot.levelState) ? snapshot.levelState : null,
      playerState: isPlainObject(snapshot.playerState) ? snapshot.playerState : null,
      playerVitals: isPlainObject(snapshot.playerVitals) ? snapshot.playerVitals : null,
      sessionState: isPlainObject(snapshot.sessionState) ? snapshot.sessionState : {},
      persistentState: isPlainObject(snapshot.persistentState) ? snapshot.persistentState : {},
      objectivesCollected: sanitizeNumber(snapshot.objectivesCollected, 0, 'objectivesCollected', issues),
      savedAt: sanitizeNumber(snapshot.savedAt, 0, 'savedAt', issues),
      projectiles: sanitizeArrayOfObjects(snapshot.projectiles, 'projectiles', issues),
      pickups: sanitizeArrayOfObjects(snapshot.pickups, 'pickups', issues),
      npcs: sanitizeArrayOfObjects(snapshot.npcs, 'npcs', issues),
      safes: sanitizeArrayOfObjects(snapshot.safes, 'safes', issues),
    };

    if (!Array.isArray(snapshot.inventory) && snapshot.inventory != null) {
      issues.push('inventory není pole');
    }
    if (!isPlainObject(snapshot.levelState) && snapshot.levelState != null) {
      issues.push('levelState není objekt');
    }
    if (!isPlainObject(snapshot.playerState) && snapshot.playerState != null) {
      issues.push('playerState není objekt');
    }
    if (!isPlainObject(snapshot.playerVitals) && snapshot.playerVitals != null) {
      issues.push('playerVitals není objekt');
    }
    if (!isPlainObject(snapshot.sessionState) && snapshot.sessionState != null) {
      issues.push('sessionState není objekt');
    }
    if (!isPlainObject(snapshot.persistentState) && snapshot.persistentState != null) {
      issues.push('persistentState není objekt');
    }

    const withDefaults = addSnapshotDefaults(sanitized);

    if (issues.length) {
      console.warn(`Save snapshot ${levelId ?? 'unknown'} obsahuje neplatná data:`, issues);
    }

    return { snapshot: withDefaults, repaired: issues.length > 0 };
  }

  function addPersistentStateToProgress(progress = {}) {
    const upgraded = {};
    Object.entries(progress).forEach(([levelId, snapshot]) => {
      upgraded[levelId] = addSnapshotDefaults(snapshot);
    });
    return upgraded;
  }

  function sanitizeProgress(progressPayload = {}) {
    const sanitized = {};
    let repaired = false;
    Object.entries(progressPayload).forEach(([levelId, snapshot]) => {
      const cleaned = sanitizeSnapshot(snapshot, levelId);
      sanitized[levelId] = cleaned.snapshot;
      if (cleaned.repaired) {
        repaired = true;
      }
    });
    return { sanitized, repaired };
  }

  const migrateToPersistentState = (payload) => ({
    ...payload,
    progress: addPersistentStateToProgress(payload?.progress ?? {}),
    version: SAVE_VERSION,
  });
  for (let version = 0; version < SAVE_VERSION; version += 1) {
    saveMigrations.set(version, migrateToPersistentState);
  }
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
    const storage = getStorageSafely();
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

    const { sanitized, repaired } = sanitizeProgress(migrated.progress);
    migrated.progress = sanitized;

    Object.keys(progress).forEach((key) => delete progress[key]);
    Object.assign(progress, migrated.progress);
    currentLevelId = migrated.currentLevelId ?? null;
    saveSlotId = migrated.slotId ?? slotId;

    if (migrated.version !== parsed.version || repaired) {
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
    const storage = getStorageSafely();
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
