import { init, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { createGame } from './core/game.js';
import { loadSpriteSheet } from './core/sprites.js';
import { createPlayer, drawPlayer, restorePlayer, serializePlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { createNpcs, drawNpcs, updateNpcStates } from './entities/npc.js';
import { renderInventory, Inventory, useInventorySlot } from './ui/inventory.js';
import { itemHandlers } from './items.js';
import { drawGrid } from './world/level-instance.js';
import { createInputSystem } from './systems/input.js';
import { createCombatSystem } from './systems/combat.js';
import { createInteractionSystem } from './systems/interactions.js';
import { createHudSystem } from './systems/hud.js';
import { createGameLoop } from './systems/game-loop.js';
import { registerScene, resume, setScene, showMenu } from './core/scenes.js';
import { DEFAULT_LEVEL_ID, getLevelConfig, getLevelMeta } from './world/level-data.js';
import { format } from './ui/messages.js';
import { formatBinding, formatControlsHint } from './core/input-bindings.js';

const { canvas, context: ctx } = init('game');
initKeys();

const inventory = new Inventory(6);
const game = createGame({ inventory });
const spriteSheetPromise = loadSpriteSheet();

const menuPanel = document.querySelector('.menu-panel');
const pausePanel = document.querySelector('.pause-panel');
const loadingPanel = document.querySelector('.loading-panel');
const levelSelectInput = document.querySelector('[data-level-input]');
const slotInput = document.querySelector('[data-slot-input]');
const menuSubtitle = document.querySelector('.menu-subtitle');
const saveSlotList = document.querySelector('[data-save-slot-list]');
const defaultMenuSubtitle = 'Vyber si akci pro další postup.';

if (levelSelectInput) {
  levelSelectInput.value = levelSelectInput.placeholder || DEFAULT_LEVEL_ID;
}
if (slotInput) {
  slotInput.value = slotInput.placeholder || 'slot-1';
}

function toggleVisibility(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function resolveSlotId() {
  if (!slotInput) return 'slot-1';
  return slotInput.value.trim() || slotInput.placeholder || 'slot-1';
}

function setSlotInputValue(value) {
  if (!slotInput || !value) return;
  slotInput.value = value;
}

function formatSaveDate(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('cs-CZ', { hour12: false });
  } catch {
    return '';
  }
}

function refreshSaveSlotList() {
  if (!saveSlotList) return;
  const saves = game.listSaves();
  saveSlotList.innerHTML = '';
  if (!saves.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = format('menu.save.empty');
    saveSlotList.appendChild(empty);
    return;
  }

  saves.forEach((save) => {
    const card = document.createElement('div');
    card.className = 'save-slot';

    const header = document.createElement('div');
    header.className = 'save-slot-header';
    const slotLabel = document.createElement('strong');
    slotLabel.textContent = save.slotId;
    const levelMeta = getLevelMeta(getLevelConfig(save.currentLevelId ?? DEFAULT_LEVEL_ID));
    const levelName = levelMeta.title ?? levelMeta.name ?? save.currentLevelId ?? 'Neznámý sektor';
    const timestamp = formatSaveDate(save.savedAt);
    const subtitle = document.createElement('div');
    subtitle.className = 'save-slot-meta';
    subtitle.textContent = `${levelName}${timestamp ? ` · ${timestamp}` : ''}`;
    header.append(slotLabel, subtitle);

    const actions = document.createElement('div');
    actions.className = 'save-slot-actions';
    const loadButton = document.createElement('button');
    loadButton.className = 'menu-button';
    loadButton.type = 'button';
    loadButton.textContent = 'Načíst';
    loadButton.addEventListener('click', () => {
      setSlotInputValue(save.slotId);
      setScene('loading', { levelId: save.currentLevelId, slotId: save.slotId, loadSlot: true });
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'menu-button ghost';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Smazat';
    deleteButton.addEventListener('click', () => {
      game.deleteSave(save.slotId);
      refreshSaveSlotList();
    });

    actions.append(loadButton, deleteButton);
    card.append(header, actions);
    saveSlotList.appendChild(card);
  });
}

function setActiveSlot(slotId, { resetProgress = false } = {}) {
  const target = slotId || resolveSlotId();
  game.setSaveSlot(target, { resetProgress });
  setSlotInputValue(target);
  return target;
}

function showMenuPanel() {
  if (menuSubtitle) {
    menuSubtitle.textContent = defaultMenuSubtitle;
  }
  refreshSaveSlotList();
  toggleVisibility(menuPanel, true);
  toggleVisibility(pausePanel, false);
  toggleVisibility(loadingPanel, false);
}

function showPausePanel() {
  toggleVisibility(pausePanel, true);
}

function hidePausePanel() {
  toggleVisibility(pausePanel, false);
}

function showLoadingPanel(message = 'Načítání...') {
  toggleVisibility(menuPanel, false);
  toggleVisibility(pausePanel, false);
  toggleVisibility(loadingPanel, true);
  if (loadingPanel) {
    loadingPanel.querySelector('[data-loading-text]').textContent = message;
  }
}

function hideAllPanels() {
  toggleVisibility(menuPanel, false);
  toggleVisibility(pausePanel, false);
  toggleVisibility(loadingPanel, false);
}

function togglePauseScene() {
  if (!currentInGameSession) return;
  if (!pausePanel?.classList.contains('hidden')) {
    resume();
  } else {
    setScene('pause');
  }
}

function drawCameraBounds({ width, height }) {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, width * TILE - 2, height * TILE - 2);
}

function createInGameSession(levelId = DEFAULT_LEVEL_ID) {
  let dialogueTime = 0;
  let activeSpeaker = '';
  let activeLine = '';
  let objectivesCollected = 0;
  let deathTimeout = null;
  let darknessTimer = 0;

  const camera = { x: 0, y: 0 };
  const projectiles = [];
  const playerVitals = {
    health: 3,
    maxHealth: 3,
    invulnerableTime: 0,
  };

  const state = {
    flags: {
      technicianGaveKey: false,
      caretakerGaveApple: false,
      gateKeyUsed: false,
    },
    quests: {},
    playerVitals,
    get dialogueTime() {
      return dialogueTime;
    },
    set dialogueTime(value) {
      dialogueTime = value;
    },
    get activeSpeaker() {
      return activeSpeaker;
    },
    set activeSpeaker(value) {
      activeSpeaker = value;
    },
    get activeLine() {
      return activeLine;
    },
    set activeLine(value) {
      activeLine = value;
    },
    get objectivesCollected() {
      return objectivesCollected;
    },
    set objectivesCollected(value) {
      objectivesCollected = value;
    },
    handlePlayerHit,
  };

  let loop = null;
  let inputSystem = null;
  let hudSystem = null;
  let playerStart = null;
  let level = null;
  let player = null;
  let npcs = null;
  let placements = null;
  let pickups = null;
  let spriteSheet = null;
  let savedSnapshot = null;
  let interactQueued = false;
  let shootQueued = false;
  let inventoryCollapsed = false;

  function getLevelDimensions() {
    return level?.getDimensions?.() ?? { width: WORLD.width, height: WORLD.height };
  }

  function serializeSessionState() {
    return {
      flags: { ...state.flags },
      quests: JSON.parse(JSON.stringify(state.quests ?? {})),
      areaName: state.areaName,
      levelNumber: state.levelNumber,
      subtitle: state.subtitle,
    };
  }

  function projectilesForSave() {
    const { width, height } = getLevelDimensions();
    const maxX = width * TILE + TILE;
    const maxY = height * TILE + TILE;
    return projectiles
      .filter((bullet) => Math.abs(bullet.x) <= maxX && Math.abs(bullet.y) <= maxY)
      .map((bullet) => ({ ...bullet }));
  }

  function restoreProjectiles(savedProjectiles = []) {
    projectiles.splice(0, projectiles.length);
    const { width, height } = getLevelDimensions();
    const maxX = width * TILE + TILE;
    const maxY = height * TILE + TILE;
    savedProjectiles.forEach((bullet) => {
      if (!bullet || typeof bullet.x !== 'number' || typeof bullet.y !== 'number') return;
      if (Math.abs(bullet.x) > maxX || Math.abs(bullet.y) > maxY) return;
      projectiles.push({ ...bullet });
    });
  }

  function setLevelMeta(meta) {
    const areaName = state.areaName ?? meta.title ?? meta.name ?? 'Unknown Sector';
    const levelNumber = state.levelNumber ?? meta.levelNumber ?? 0;
    const subtitle = state.subtitle ?? meta.subtitle ?? '';
    hudSystem.setLevelTitle(areaName, levelNumber);
    hudSystem.setSubtitle(subtitle);
  }

  async function bootstrap() {
    spriteSheet = await spriteSheetPromise;
    level = await game.loadLevel(levelId);
    savedSnapshot = game.getSavedSnapshot(game.currentLevelId ?? levelId);
    placements = level.getActorPlacements();
    player = createPlayer(spriteSheet, placements);
    restorePlayer(player, savedSnapshot?.playerState, placements.playerStart ?? player);
    playerStart = { x: player.x, y: player.y };
    pickups = createPickups(level.getPickupTemplates());
    npcs = createNpcs(spriteSheet, placements);

    if (savedSnapshot?.playerVitals) {
      Object.assign(playerVitals, savedSnapshot.playerVitals);
    }

    if (savedSnapshot?.sessionState) {
      Object.assign(state.flags, savedSnapshot.sessionState.flags ?? {});
      Object.assign(state.quests, savedSnapshot.sessionState.quests ?? {});
      state.areaName = savedSnapshot.sessionState.areaName ?? state.areaName;
      state.levelNumber = savedSnapshot.sessionState.levelNumber ?? state.levelNumber;
      state.subtitle = savedSnapshot.sessionState.subtitle ?? state.subtitle;
    }

    state.objectivesCollected = game.objectivesCollected ?? savedSnapshot?.objectivesCollected ?? 0;
    objectivesCollected = state.objectivesCollected;
    restoreProjectiles(savedSnapshot?.projectiles);

    hudSystem = createHudSystem();
    game.setHud(hudSystem);
    hudSystem.showNote('note.inventory.intro');
    hudSystem.setObjectives(objectivesCollected, level.getObjectiveTotal());
    hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);
    setLevelMeta(level.meta);

    renderInventory(inventory);

    const inventoryElement = document.querySelector('.inventory');

    const handleInventoryUse = (slotIndex) =>
      useInventorySlot({
        inventory,
        slotIndex,
        playerVitals,
        updateHealthHud: () => hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth),
        renderInventory,
        showNote: hudSystem.showNote,
        handlers: itemHandlers,
      });

    function setInventoryCollapsed(collapsed) {
      inventoryCollapsed = Boolean(collapsed);
      inventoryElement?.classList.toggle('collapsed', inventoryCollapsed);
      const bindingLabel = formatBinding(inputSystem.getBindings(), 'toggle-inventory');
      hudSystem.setInventoryStatus(inventoryCollapsed, bindingLabel);
    }

    function toggleInventory() {
      setInventoryCollapsed(!inventoryCollapsed);
    }

    function handleAction(action, detail = {}) {
      switch (action) {
        case 'interact':
          interactQueued = true;
          break;
        case 'shoot':
          shootQueued = true;
          break;
        case 'use-slot':
          handleInventoryUse(detail.slotIndex);
          break;
        case 'toggle-pause':
          togglePauseScene();
          break;
        case 'toggle-inventory':
          toggleInventory();
          break;
        default:
          break;
      }
    }

    inputSystem = createInputSystem({
      inventorySlots: inventory.slots.length,
      onAction: handleAction,
    });

    const controlsHint = formatControlsHint(inputSystem.getBindings());
    hudSystem.setControlsHint(controlsHint);
    hudSystem.setInventoryBindingHint(controlsHint.inventory);
    hudSystem.setInventoryStatus(inventoryCollapsed, controlsHint.inventory);

    const combatSystem = createCombatSystem({
      inventory,
      projectiles,
      player,
      renderInventory,
      tileAt: level.tileAt.bind(level),
      showNote: hudSystem.showNote,
    });

    const interactionSystem = createInteractionSystem({
      inventory,
      pickups,
      npcs,
      hud: hudSystem,
      state,
      level,
      game,
      renderInventory,
      showNote: hudSystem.showNote,
      setObjectives: (count) => hudSystem.setObjectives(count ?? state.objectivesCollected, level.getObjectiveTotal()),
      collectNearbyPickups,
    });

    loop = createGameLoop({
      update(dt) {
        updatePlayer(player, dt, { canMove: level.canMove.bind(level) });
        level.clampCamera(camera, player, canvas);

        if (playerVitals.invulnerableTime > 0) {
          playerVitals.invulnerableTime = Math.max(0, playerVitals.invulnerableTime - dt);
        }

        const { nearestNpc, guardCollision } = updateNpcStates(npcs, player, dt);

        if (guardCollision && playerVitals.invulnerableTime === 0) {
          handlePlayerHit();
        }

        const interactContext = interactionSystem.handleInteract(player, {
          interactRequested: interactQueued,
          nearestNpc,
          guardCollision,
        });

        interactQueued = false;

        if (shootQueued) {
          combatSystem.attemptShoot();
        }
        shootQueued = false;

        combatSystem.updateProjectiles(dt, npcs);
        applyDarknessDamage(dt);

        interactionSystem.updateInteractions(player, {
          ...interactContext,
          dt,
        });
      },
      render() {
        drawGrid(ctx, canvas, getLevelDimensions());
        level.drawLevel(ctx, camera, spriteSheet);
        level.drawLightSwitches(ctx, camera);
        drawPickups(ctx, camera, pickups, spriteSheet);
        combatSystem.drawProjectiles(ctx, camera);
        drawNpcs(ctx, camera, npcs);
        drawPlayer(ctx, camera, player, spriteSheet);
        level.drawLighting(ctx, camera);
        drawCameraBounds(getLevelDimensions());
      },
    });

    game.setSnapshotProvider(() => ({
      playerState: serializePlayer(player),
      playerVitals: { ...playerVitals },
      projectiles: projectilesForSave(),
      sessionState: serializeSessionState(),
    }));
  }

  function applyDamage({ invulnerability = 0, resetPosition = false, note, deathNote }) {
    if (deathTimeout || playerVitals.health <= 0) return;

    playerVitals.health -= 1;
    playerVitals.invulnerableTime = Math.max(playerVitals.invulnerableTime, invulnerability);
    hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);

    if (playerVitals.health <= 0) {
      handlePlayerDeath(deathNote);
      return;
    }

    if (resetPosition) {
      player.x = playerStart.x;
      player.y = playerStart.y;
    }

    if (note) {
      hudSystem.showNote(note);
    }
  }

  function handlePlayerHit() {
    applyDamage({
      invulnerability: 1.2,
      resetPosition: true,
      note: 'note.damage.hit',
      deathNote: 'note.death.guard',
    });
  }

  function handlePlayerDeath(deathNote) {
    if (deathTimeout) return;
    hudSystem.hideInteraction();
    hudSystem.showNote(deathNote || 'note.death.darkness');
    dialogueTime = 0;
    const currentLevelId = game.currentLevelId ?? levelId ?? DEFAULT_LEVEL_ID;
    deathTimeout = setTimeout(() => {
      setScene('loading', { levelId: currentLevelId });
    }, 900);
  }

  function applyDarknessDamage(dt) {
    if (level.isLitAt(player.x, player.y)) {
      darknessTimer = 0;
      return;
    }

    darknessTimer += dt;
    if (darknessTimer >= 1 && playerVitals.invulnerableTime <= 0) {
      darknessTimer = 0;
      applyDamage({
        invulnerability: 1,
        note: 'note.damage.darkness',
        deathNote: 'note.death.darkness',
      });
    }
  }

  function manualSave() {
    if (!game.saveSlotId) {
      hudSystem?.showToast?.('note.save.missingSlot');
      return;
    }
    game.saveProgress({ manual: true });
    refreshSaveSlotList();
  }

  function resetActionQueue() {
    interactQueued = false;
    shootQueued = false;
  }

  function pause() {
    resetActionQueue();
    loop?.pauseUpdates?.();
  }

  function resume() {
    hidePausePanel();
    resetActionQueue();
    loop?.resumeUpdates?.();
    loop?.start();
  }

  function cleanup() {
    inputSystem?.destroy?.();
    loop?.stop();
    if (deathTimeout) {
      clearTimeout(deathTimeout);
      deathTimeout = null;
    }
    game.setSnapshotProvider(null);
    hudSystem?.hideToast?.();
  }

  return {
    bootstrap,
    pause,
    resume,
    cleanup,
    manualSave,
    levelId: () => level?.meta?.id ?? levelId ?? DEFAULT_LEVEL_ID,
  };
}

let currentInGameSession = null;

registerScene('menu', {
  async onEnter() {
    showMenuPanel();
  },
});

registerScene('loading', {
  async onEnter({ params }) {
    showLoadingPanel('Načítání levelu...');
    const requestedSlot = params?.slotId || resolveSlotId();
    if (params?.freshStart) {
      setActiveSlot(requestedSlot, { resetProgress: true });
    } else if (params?.loadSlot && requestedSlot) {
      const loaded = game.loadFromSlot(requestedSlot);
      setActiveSlot(requestedSlot);
      if (loaded?.currentLevelId) {
        params.levelId = loaded.currentLevelId;
      }
    } else if (requestedSlot) {
      setActiveSlot(requestedSlot);
    }

    const nextLevelId = params?.levelId || game.currentLevelId || levelSelectInput?.value || DEFAULT_LEVEL_ID;
    currentInGameSession?.cleanup?.();
    currentInGameSession = createInGameSession(nextLevelId);
    await currentInGameSession.bootstrap();
    hideAllPanels();
    await setScene('inGame');
  },
});

registerScene('inGame', {
  async onEnter() {
    hideAllPanels();
    currentInGameSession?.resume?.();
  },
  async onPause() {
    currentInGameSession?.pause?.();
    showPausePanel();
  },
  async onResume() {
    hidePausePanel();
    currentInGameSession?.resume?.();
  },
  async onExit() {
    currentInGameSession?.cleanup?.();
    currentInGameSession = null;
  },
});

registerScene('pause', {
  async onEnter() {
    showPausePanel();
  },
  async onExit() {
    hidePausePanel();
  },
});

const startButton = document.querySelector('[data-menu-start]');
const continueButton = document.querySelector('[data-menu-continue]');
const selectButton = document.querySelector('[data-menu-select]');
const settingsButton = document.querySelector('[data-menu-settings]');
const pauseResumeButton = document.querySelector('[data-pause-resume]');
const pauseSaveButton = document.querySelector('[data-pause-save]');
const pauseMenuButton = document.querySelector('[data-pause-menu]');

startButton?.addEventListener('click', () =>
  setScene('loading', { levelId: DEFAULT_LEVEL_ID, slotId: resolveSlotId(), freshStart: true }),
);
continueButton?.addEventListener('click', () => {
  const saves = game.listSaves();
  const latest = saves[0];
  if (latest) {
    setScene('loading', { levelId: latest.currentLevelId, slotId: latest.slotId, loadSlot: true });
    return;
  }
  setScene('loading', { levelId: game.currentLevelId ?? DEFAULT_LEVEL_ID, slotId: resolveSlotId() });
});
selectButton?.addEventListener('click', () => {
  const chosen = levelSelectInput?.value || DEFAULT_LEVEL_ID;
  setScene('loading', { levelId: chosen, slotId: resolveSlotId(), freshStart: true });
});
settingsButton?.addEventListener('click', () => {
  if (menuSubtitle) {
    menuSubtitle.textContent = 'Nastavení budou brzy dostupná.';
  }
});
pauseResumeButton?.addEventListener('click', () => {
  if (pausePanel?.classList.contains('hidden')) {
    togglePauseScene();
  } else {
    resume();
  }
});
pauseSaveButton?.addEventListener('click', () => currentInGameSession?.manualSave?.());
pauseMenuButton?.addEventListener('click', () => showMenu());

game.onReturnToMenu(() => {
  showMenu();
  refreshSaveSlotList();
});
game.onAdvanceToMap((nextLevelId) => {
  if (nextLevelId) {
    setScene('loading', { levelId: nextLevelId });
    return;
  }
  showMenu();
});

setScene('menu');
