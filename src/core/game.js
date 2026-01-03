import { getLevelConfig, getLevelMeta } from '../world/level-data.js';
import { LevelInstance } from '../world/level-instance.js';

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

  function loadLevel(id) {
    const config = getLevelConfig(id);
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
      sessionState: extraSnapshot.sessionState ?? null,
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

  function advanceToNextMap(nextLevelId) {
    hooks.advanceToMap?.(nextLevelId ?? null);
    if (!hooks.advanceToMap && nextLevelId) {
      loadLevel(nextLevelId);
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

  function loadFromSlot(slotId) {
    if (!slotId) return null;
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(getStorageKey(slotId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      Object.keys(progress).forEach((key) => delete progress[key]);
      Object.assign(progress, parsed.progress ?? {});
      currentLevelId = parsed.currentLevelId ?? null;
      saveSlotId = parsed.slotId ?? slotId;
      return parsed;
    } catch (err) {
      console.error('Failed to load save', err);
      return null;
    }
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
