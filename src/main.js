import { init, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { createGame } from './core/game.js';
import { loadSpriteSheet } from './core/sprites.js';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { createNpcs, drawNpcs, updateNpcStates } from './entities/npc.js';
import { renderInventory, Inventory } from './ui/inventory.js';
import { itemHandlers } from './items.js';
import { drawGrid } from './world/level-instance.js';
import { createInputSystem } from './systems/input.js';
import { createCombatSystem } from './systems/combat.js';
import { createInteractionSystem } from './systems/interactions.js';
import { createHudSystem } from './systems/hud.js';
import { createGameLoop } from './systems/game-loop.js';
import { registerScene, resume, setScene, showMenu } from './core/scenes.js';
import { DEFAULT_LEVEL_ID } from './world/level-data.js';

const { canvas, context: ctx } = init('game');
initKeys();

const inventory = new Inventory(6);
const game = createGame({ inventory });
const spriteSheetPromise = loadSpriteSheet();

const menuPanel = document.querySelector('.menu-panel');
const pausePanel = document.querySelector('.pause-panel');
const loadingPanel = document.querySelector('.loading-panel');
const levelSelectInput = document.querySelector('[data-level-input]');
const menuSubtitle = document.querySelector('.menu-subtitle');
const defaultMenuSubtitle = 'Vyber si akci pro další postup.';

if (levelSelectInput) {
  levelSelectInput.value = levelSelectInput.placeholder || DEFAULT_LEVEL_ID;
}

function toggleVisibility(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function showMenuPanel() {
  if (menuSubtitle) {
    menuSubtitle.textContent = defaultMenuSubtitle;
  }
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

function drawCameraBounds() {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, WORLD.width * TILE - 2, WORLD.height * TILE - 2);
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

  function setLevelMeta(meta) {
    const areaName = meta.title ?? meta.name ?? 'Unknown Sector';
    const levelNumber = meta.levelNumber ?? 0;
    const subtitle = meta.subtitle ?? 'hud.controls';
    hudSystem.setLevelTitle(areaName, levelNumber);
    hudSystem.setSubtitle(subtitle);
  }

  async function bootstrap() {
    spriteSheet = await spriteSheetPromise;
    level = game.loadLevel(levelId);
    placements = level.getActorPlacements();
    player = createPlayer(spriteSheet, placements);
    playerStart = { x: placements.playerStart?.x ?? player.x, y: placements.playerStart?.y ?? player.y };
    pickups = createPickups(level.getPickupTemplates());
    npcs = createNpcs(spriteSheet, placements);

    renderInventory(inventory);
    hudSystem = createHudSystem();
    game.setHud(hudSystem);
    hudSystem.showNote('note.inventory.intro');
    hudSystem.setObjectives(objectivesCollected, level.getObjectiveTotal());
    hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);
    setLevelMeta(level.meta);

    inputSystem = createInputSystem({
      inventory,
      playerVitals,
      updateHealthHud: () => hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth),
      renderInventory,
      showNote: hudSystem.showNote,
      handlers: itemHandlers,
      onPauseToggle: togglePauseScene,
    });

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
          interactRequested: inputSystem.consumeInteractRequest(),
          nearestNpc,
          guardCollision,
        });

        if (inputSystem.consumeShootRequest()) {
          combatSystem.attemptShoot();
        }
        combatSystem.updateProjectiles(dt, npcs);
        applyDarknessDamage(dt);

        interactionSystem.updateInteractions(player, {
          ...interactContext,
          dt,
        });
      },
      render() {
        drawGrid(ctx, canvas);
        level.drawLevel(ctx, camera, spriteSheet);
        level.drawLightSwitches(ctx, camera);
        drawPickups(ctx, camera, pickups, spriteSheet);
        combatSystem.drawProjectiles(ctx, camera);
        drawNpcs(ctx, camera, npcs);
        drawPlayer(ctx, camera, player, spriteSheet);
        level.drawLighting(ctx, camera);
        drawCameraBounds();
      },
    });
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

  function pause() {
    loop?.stop();
  }

  function resume() {
    hidePausePanel();
    loop?.start();
  }

  function cleanup() {
    inputSystem?.destroy?.();
    loop?.stop();
    if (deathTimeout) {
      clearTimeout(deathTimeout);
      deathTimeout = null;
    }
  }

  return {
    bootstrap,
    pause,
    resume,
    cleanup,
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
    const nextLevelId = params?.levelId || levelSelectInput?.value || game.currentLevelId || DEFAULT_LEVEL_ID;
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
const pauseMenuButton = document.querySelector('[data-pause-menu]');

startButton?.addEventListener('click', () => setScene('loading', { levelId: DEFAULT_LEVEL_ID }));
continueButton?.addEventListener('click', () =>
  setScene('loading', { levelId: game.currentLevelId ?? DEFAULT_LEVEL_ID }),
);
selectButton?.addEventListener('click', () => {
  const chosen = levelSelectInput?.value || DEFAULT_LEVEL_ID;
  setScene('loading', { levelId: chosen });
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
pauseMenuButton?.addEventListener('click', () => showMenu());

game.onReturnToMenu(() => showMenu());
game.onAdvanceToMap((nextLevelId) => {
  if (nextLevelId) {
    setScene('loading', { levelId: nextLevelId });
    return;
  }
  showMenu();
});

setScene('menu');
