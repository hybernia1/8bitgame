import { getLevelConfig, getLevelMeta } from '../world/level-data.js';
import { LevelInstance } from '../world/level-instance.js';

export function createGame({ inventory, hudSystem } = {}) {
  const progress = {};
  const hooks = {
    returnToMenu: null,
    advanceToMap: null,
  };

  let currentLevelId = null;
  let currentLevel = null;
  let objectivesCollected = 0;
  let hud = hudSystem;

  function setHud(nextHud) {
    hud = nextHud;
    syncHud();
  }

  function syncHud() {
    if (!hud || !currentLevel) return;
    const meta = getLevelMeta(currentLevel.config);
    hud.updateAreaTitle?.(meta.title ?? meta.name ?? meta.id ?? 'Unknown Sector', meta.levelNumber ?? 0);
    hud.updateSubtitle?.(meta.subtitle ?? '');
    hud.updateObjectiveHud?.(objectivesCollected);
  }

  function loadLevel(id) {
    const config = getLevelConfig(id);
    currentLevel = new LevelInstance(config);
    currentLevelId = config.meta?.id ?? id ?? 'level';
    objectivesCollected = 0;

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

  function saveProgress() {
    if (!currentLevelId) return null;
    const snapshot = {
      objectivesCollected,
      inventory: inventory?.serialize?.(),
      levelState: currentLevel?.serializeState?.(),
    };
    progress[currentLevelId] = snapshot;
    return snapshot;
  }

  function recordObjectives(count) {
    objectivesCollected = count;
    hud?.updateObjectiveHud?.(objectivesCollected);
    saveProgress();
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
    if (nextLevelId) {
      loadLevel(nextLevelId);
    }
  }

  return {
    loadLevel,
    saveProgress,
    recordObjectives,
    setHud,
    onReturnToMenu,
    onAdvanceToMap,
    returnToMenu,
    advanceToNextMap,
    get currentLevel() {
      return currentLevel;
    },
    get objectivesCollected() {
      return objectivesCollected;
    },
  };
}
