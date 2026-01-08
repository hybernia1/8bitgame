import { COLORS, TILE, WORLD } from '../core/constants.js';
import { formatBinding, formatControlsHint } from '../core/input-bindings.js';
import { runActions } from '../core/actions.js';
import { createCombatSystem } from './combat.js';
import { createHudSystem } from './hud.js';
import { createInputSystem } from './input.js';
import { createInteractionSystem } from './interactions.js';
import { registerScene, resume, setScene, showMenu } from '../core/scenes.js';
import { format } from '../ui/messages.js';
import { renderInventory, useInventorySlot } from '../ui/inventory.js';
import {
  DEFAULT_LEVEL_ID,
  getLevelConfig,
  getLevelMeta,
  loadLevelConfig,
  loaderRegistry,
  registry,
} from '../world/level-data.js';
import { drawGrid } from '../world/level-instance.js';
import { itemHandlers } from '../items.js';
import {
  createPlayer,
  drawPlayer,
  restorePlayer,
  serializePlayer,
  updatePlayer,
} from '../entities/player.js';
import {
  collectNearbyPickups,
  createPickups,
  drawPickups,
  restorePickups,
  serializePickups,
} from '../entities/pickups.js';
import { createPushables, drawPushables, restorePushables, serializePushables } from '../entities/pushables.js';
import { createSafes, drawSafes, restoreSafes, serializeSafes } from '../entities/safes.js';
import {
  createNpcs,
  drawNpcs,
  restoreNpcs,
  serializeNpcs,
  updateNpcStates,
} from '../entities/npc.js';
import { prologueDialogues } from '../data/levels/0-prologue/index.js';
import { createRooftopCorridorScript } from '../data/levels/3-rooftop-corridor/script.js';

const PROLOGUE_LEVEL_ID = 'level-0-prologue';
const PROLOGUE_STEPS = Array.isArray(prologueDialogues) ? prologueDialogues : [];

function getHudDomRefs(root) {
  if (!root) return {};
  const subtitleElement = root.querySelector('[data-controls-hint]') ?? root.querySelector('.subtitle');
  return {
    hudTitle: root.querySelector('.level-title'),
    hudSubtitle: subtitleElement,
    objectivesCollectedEl: root.querySelector('[data-objectives-collected]'),
    objectivesTotalEl: root.querySelector('[data-objectives-total]'),
    questTitle: root.querySelector('[data-quest-title]'),
    questDescription: root.querySelector('[data-quest-description]'),
    questProgress: root.querySelector('[data-quest-progress]'),
    questLog: root.querySelector('.quest-log'),
    questToggle: root.querySelector('[data-quest-toggle]'),
    healthHeartsEl: root.querySelector('[data-health-hearts]'),
    healthCurrentEl: root.querySelector('.hud-health-current'),
    healthTotalEl: root.querySelector('.hud-health-total'),
    ammoEl: root.querySelector('[data-ammo]'),
    ammoCurrentEl: root.querySelector('[data-ammo-count]'),
    inventoryNote: root.querySelector('[data-inventory-note]'),
    inventoryBinding: root.querySelector('[data-inventory-binding]'),
    toast: root.querySelector('.hud-toast'),
    banner: root.querySelector('.interaction-banner'),
    bannerTitle: root.querySelector('.interaction-title'),
    bannerBody: root.querySelector('.interaction-text'),
    bannerAvatar: root.querySelector('[data-dialogue-avatar]'),
    pauseBindings: root.querySelector('[data-pause-bindings]'),
  };
}

function getSafeDomRefs(root) {
  if (!root) return {};
  return {
    safePanel: root.querySelector('[data-safe-panel]'),
    safeForm: root.querySelector('[data-safe-form]'),
    safeTitle: root.querySelector('[data-safe-title]'),
    safeDescription: root.querySelector('[data-safe-description]'),
    safeInput: root.querySelector('[data-safe-input]'),
    safeSubmit: root.querySelector('[data-safe-submit]'),
    safeCancel: root.querySelector('[data-safe-cancel]'),
    safeFeedback: root.querySelector('[data-safe-feedback]'),
  };
}

function getQuizDomRefs(root) {
  if (!root) return {};
  return {
    quizPanel: root.querySelector('[data-quiz-panel]'),
    quizTitle: root.querySelector('[data-quiz-title]'),
    quizQuestion: root.querySelector('[data-quiz-question]'),
    quizOptions: root.querySelector('[data-quiz-options]'),
    quizFeedback: root.querySelector('[data-quiz-feedback]'),
    quizCancel: root.querySelector('[data-quiz-cancel]'),
  };
}

function toggleVisibility(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function formatSaveDate(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('cs-CZ', { hour12: false });
  } catch {
    return '';
  }
}

export function createSessionSystem({ canvas, ctx, game, inventory, spriteSheetPromise, shell }) {
  const hudDomRefs = getHudDomRefs(shell.documentRoot);
  const safeDomRefs = getSafeDomRefs(shell.documentRoot);
  const quizDomRefs = getQuizDomRefs(shell.documentRoot);

  let inventoryToggleButton = null;
  let handleInventoryToggleClick = null;
  let questToggleButton = null;
  let handleQuestToggleClick = null;
  let handleSafeCancelClick = null;
  let questLogCollapsed = true;

  const {
    documentRoot,
    menuPanel,
    menuScreens,
    menuLevelList,
    menuBackButtons,
    menuNewGameButton,
    menuContinueButton,
    menuContinueLatestButton,
    menuLevelsButton,
    pausePanel,
    loadingPanel,
    continuePanel,
    continueTitle,
    continueSubtitle,
    continueDetail,
    prologuePanel,
    prologueContinueButton,
    prologueBackButton,
    prologueStepTitle,
    prologueStepBody,
    prologueProgress,
    prologueAvatar,
    prologueSpeaker,
    prologueKicker,
    slotInput,
    saveSlotList,
    startButton,
    settingsButton,
    pauseResumeButton,
    pauseRestartButton,
    pauseSaveButton,
    pauseMenuButton,
    alertLayer,
    setFullscreenAvailability,
    fullscreenSupported,
  } = shell;

  const isFullscreenSupported = Boolean(fullscreenSupported);

  if (slotInput) {
    slotInput.value = slotInput.placeholder || 'slot-1';
  }

  function resolveSlotId() {
    if (!slotInput) return 'slot-1';
    return slotInput.value.trim() || slotInput.placeholder || 'slot-1';
  }

  function setSlotInputValue(value) {
    if (!slotInput || !value) return;
    slotInput.value = value;
  }

  function showMenuScreen(screenName) {
    if (!menuScreens) return;
    menuScreens.forEach((screen) => {
      const isActive = screen.dataset.menuScreen === screenName;
      screen.classList.toggle('hidden', !isActive);
    });
  }

  function getKnownLevelIds() {
    return [
      ...new Set([DEFAULT_LEVEL_ID, ...registry.keys(), ...loaderRegistry.keys()].filter(Boolean)),
    ];
  }

  async function refreshLevelList() {
    if (!menuLevelList) return;
    menuLevelList.innerHTML = '';

    const ids = getKnownLevelIds();
    const configs = await Promise.all(ids.map((id) => loadLevelConfig(id)));
    const entries = configs.map((config, index) => {
      const meta = getLevelMeta(config);
      return {
        id: config.meta?.id ?? ids[index],
        levelNumber: meta.levelNumber,
        title: meta.title ?? meta.name ?? ids[index],
      };
    });

    const uniqueEntries = new Map(entries.map((entry) => [entry.id, entry]));
    const sortedEntries = [...uniqueEntries.values()].sort((a, b) => {
      const aValue = Number.isFinite(a.levelNumber) ? a.levelNumber : Number.POSITIVE_INFINITY;
      const bValue = Number.isFinite(b.levelNumber) ? b.levelNumber : Number.POSITIVE_INFINITY;
      if (aValue !== bValue) return aValue - bValue;
      return a.title.localeCompare(b.title, 'cs-CZ');
    });

    if (!sortedEntries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Žádné levely nejsou k dispozici.';
      menuLevelList.appendChild(empty);
      return;
    }

    sortedEntries.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'menu-button';
      button.dataset.levelId = entry.id;
      button.textContent = Number.isFinite(entry.levelNumber)
        ? `Level ${entry.levelNumber}: ${entry.title}`
        : entry.title;
      button.addEventListener('click', () => {
        setScene('loading', { levelId: entry.id, slotId: resolveSlotId(), freshStart: true });
      });
      menuLevelList.appendChild(button);
    });
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
    setFullscreenAvailability(isFullscreenSupported);
    refreshSaveSlotList();
    hideContinuePanel();
    showMenuScreen('main');
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
    const loadingText = loadingPanel?.querySelector?.('[data-loading-text]');
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  function hideContinuePanel() {
    toggleVisibility(continuePanel, false);
    if (continueDetail) {
      continueDetail.classList.add('hidden');
    }
  }

  function showContinuePanel({ title, subtitle, detail } = {}) {
    toggleVisibility(menuPanel, false);
    toggleVisibility(pausePanel, false);
    toggleVisibility(loadingPanel, false);
    toggleVisibility(continuePanel, true);
    if (continueTitle) {
      continueTitle.textContent = title ?? '';
    }
    if (continueSubtitle) {
      continueSubtitle.textContent = subtitle ?? format('loading.pressAnyKey');
    }
    if (continueDetail) {
      continueDetail.textContent = detail ?? '';
      continueDetail.classList.toggle('hidden', !detail);
    }
  }

  function waitForContinuePrompt(content = {}) {
    if (!continuePanel) return Promise.resolve();
    showContinuePanel(content);
    return new Promise((resolve) => {
      const events = ['keydown', 'mousedown', 'touchstart'];
      const cleanup = () => {
        events.forEach((event) => window.removeEventListener(event, handler));
        hideContinuePanel();
        resolve();
      };
      const handler = () => cleanup();
      events.forEach((event) => window.addEventListener(event, handler, { once: true }));
    });
  }

  function renderPrologueStep(index = 0, steps = PROLOGUE_STEPS) {
    const step = steps[index] ?? steps[0];
    const total = steps.length;
    if (prologueStepTitle) {
      prologueStepTitle.textContent = step?.title ?? 'Prolog';
    }
    if (prologueSpeaker) {
      prologueSpeaker.textContent = step?.speaker ?? '';
    }
    if (prologueKicker) {
      prologueKicker.textContent = step?.kicker ?? 'Prolog';
    }
    if (prologueProgress) {
      prologueProgress.textContent = `${Math.min(index + 1, total)} / ${total}`;
    }
    if (prologueContinueButton && step?.actionLabel) {
      prologueContinueButton.textContent = step.actionLabel;
    }
    if (prologueAvatar) {
      const avatarId = step?.avatar || step?.speakerType || '';
      if (avatarId) {
        prologueAvatar.dataset.avatar = avatarId;
        prologueAvatar.classList.remove('hidden');
      } else {
        prologueAvatar.dataset.avatar = '';
        prologueAvatar.classList.add('hidden');
      }
    }
    if (prologueStepBody) {
      prologueStepBody.innerHTML = '';
      (step?.body ?? []).forEach((paragraph) => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        prologueStepBody.appendChild(p);
      });
    }
  }

  function showProloguePanel() {
    hideAllPanels();
    toggleVisibility(prologuePanel, true);
    setFullscreenAvailability(isFullscreenSupported);
    prologueContinueButton?.focus?.();
  }

  function hideProloguePanel() {
    toggleVisibility(prologuePanel, false);
  }

  function waitForPrologueContinue(steps = PROLOGUE_STEPS) {
    if (!prologuePanel) return Promise.resolve();
    let stepIndex = 0;
    renderPrologueStep(stepIndex, steps);
    showProloguePanel();

    const updateNav = () => {
      const step = steps[stepIndex];
      const isLast = stepIndex >= steps.length - 1;
      if (prologueContinueButton) {
        prologueContinueButton.textContent = step?.actionLabel || (isLast ? 'Vyrazit' : 'Další');
      }
      if (prologueBackButton) {
        prologueBackButton.disabled = stepIndex === 0;
        prologueBackButton.setAttribute('aria-disabled', stepIndex === 0 ? 'true' : 'false');
      }
    };

    updateNav();

    return new Promise((resolve) => {
      const cleanup = () => {
        window.removeEventListener('keydown', keyHandler);
        prologueContinueButton?.removeEventListener('click', nextHandler);
        prologueBackButton?.removeEventListener('click', backHandler);
        hideProloguePanel();
        resolve();
      };
      const advance = (direction = 1) => {
        const nextIndex = stepIndex + direction;
        if (nextIndex < 0) return;
        if (nextIndex >= steps.length) {
          cleanup();
          return;
        }
        stepIndex = nextIndex;
        renderPrologueStep(stepIndex, steps);
        updateNav();
      };
      const keyHandler = (event) => {
        if (event.key === 'Tab') return;
        if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
          advance(-1);
        } else if (event.key === 'ArrowRight') {
          advance(1);
        } else if (event.key === 'Enter' || event.key === ' ') {
          if (stepIndex >= steps.length - 1) {
            cleanup();
          } else {
            advance(1);
          }
        }
      };
      const nextHandler = () => {
        if (stepIndex >= PROLOGUE_STEPS.length - 1) {
          cleanup();
        } else {
          advance(1);
        }
      };
      const backHandler = () => advance(-1);
      window.addEventListener('keydown', keyHandler);
      prologueContinueButton?.addEventListener('click', nextHandler);
      prologueBackButton?.addEventListener('click', backHandler);
    });
  }

  function hideAllPanels() {
    toggleVisibility(menuPanel, false);
    toggleVisibility(pausePanel, false);
    toggleVisibility(loadingPanel, false);
    hideContinuePanel();
    hideProloguePanel();
  }

  function togglePauseScene() {
    if (!currentInGameSession) return;
    if (!pausePanel?.classList.contains('hidden')) {
      resume();
    } else {
      setScene('pause');
    }
  }

  function restartLevelFromPause() {
    const levelId = currentInGameSession?.levelId?.() ?? game.currentLevelId ?? DEFAULT_LEVEL_ID;
    setScene('loading', { levelId, slotId: resolveSlotId() });
  }

  function drawCameraBounds({ width, height }, camera) {
    ctx.strokeStyle = COLORS.gridBorder;
    ctx.strokeRect(1 - camera.x, 1 - camera.y, width * TILE - 2, height * TILE - 2);
  }

  function createInGameSession(levelId = DEFAULT_LEVEL_ID) {
    let dialogueTime = 0;
    let objectivesCollected = 0;
    let deathTimeout = null;
    let darknessTimer = 0;
    let levelScript = null;

    const camera = { x: 0, y: 0 };
    const projectiles = [];
    const playerVitals = {
      health: 3,
      maxHealth: 3,
      invulnerableTime: 0,
      ammo: 0,
      maxAmmo: 0,
    };

    const persistentState = {
      flags: {
        technicianGaveKey: false,
        caretakerGaveApple: false,
        gateKeyUsed: false,
        technicianLightOn: false,
        technicianQuestioned: false,
      },
      quests: {},
      areaName: undefined,
      levelNumber: undefined,
      subtitle: undefined,
    };

    const sessionState = {
      dialogueTime: 0,
      activeSpeaker: '',
      activeLine: '',
      dialogueMeta: null,
      activeQuiz: null,
      levelAdvanceQueued: false,
    };

    function resetSessionState() {
      sessionState.dialogueTime = 0;
      sessionState.activeSpeaker = '';
      sessionState.activeLine = '';
      sessionState.dialogueMeta = null;
      sessionState.activeQuiz = null;
      sessionState.levelAdvanceQueued = false;
    }

    const state = {
      persistentState,
      sessionState,
      playerVitals,
      get flags() {
        return persistentState.flags;
      },
      set flags(value) {
        persistentState.flags = value ?? {};
      },
      get quests() {
        return persistentState.quests;
      },
      set quests(value) {
        persistentState.quests = value ?? {};
      },
      get areaName() {
        return persistentState.areaName;
      },
      set areaName(value) {
        persistentState.areaName = value;
      },
      get levelNumber() {
        return persistentState.levelNumber;
      },
      set levelNumber(value) {
        persistentState.levelNumber = value;
      },
      get subtitle() {
        return persistentState.subtitle;
      },
      set subtitle(value) {
        persistentState.subtitle = value;
      },
      get levelAdvanceQueued() {
        return sessionState.levelAdvanceQueued;
      },
      set levelAdvanceQueued(value) {
        sessionState.levelAdvanceQueued = value;
      },
      get dialogueTime() {
        return sessionState.dialogueTime;
      },
      set dialogueTime(value) {
        sessionState.dialogueTime = value;
      },
      get activeSpeaker() {
        return sessionState.activeSpeaker;
      },
      set activeSpeaker(value) {
        sessionState.activeSpeaker = value;
      },
      get activeLine() {
        return sessionState.activeLine;
      },
      set activeLine(value) {
        sessionState.activeLine = value;
      },
      get dialogueMeta() {
        return sessionState.dialogueMeta;
      },
      set dialogueMeta(value) {
        sessionState.dialogueMeta = value;
      },
      get objectivesCollected() {
        return objectivesCollected;
      },
      set objectivesCollected(value) {
        objectivesCollected = value;
      },
      handlePlayerHit,
    };

    let inputSystem = null;
    let hudSystem = null;
    let playerStart = null;
    let level = null;
    let player = null;
    let npcs = null;
    let placements = null;
    let pickups = null;
    let pushables = null;
    let safes = [];
    let spriteSheet = null;
    let savedSnapshot = null;
    let safePanel = null;
    let safeForm = null;
    let safeTitle = null;
    let safeDescription = null;
    let safeInput = null;
    let safeSubmit = null;
    let safeCancel = null;
    let safeFeedback = null;
    let quizPanel = null;
    let quizTitle = null;
    let quizQuestion = null;
    let quizOptions = null;
    let quizFeedback = null;
    let quizCancel = null;
    let hideSafePanel = () => {};
    let hideQuizPanel = () => {};
    let handleSafeSubmit = null;
    let handleQuizOptionClick = null;
    let handleQuizCancelClick = null;
    let interactQueued = false;
    let shootQueued = false;
    let prologuePlayed = false;

    const isPrologueLevel = () => (level?.meta?.id ?? levelId ?? '') === PROLOGUE_LEVEL_ID;

    function getLevelDimensions() {
      return level?.getDimensions?.() ?? { width: WORLD.width, height: WORLD.height };
    }

    function serializePersistentState() {
      return {
        flags: { ...persistentState.flags },
        quests: JSON.parse(JSON.stringify(persistentState.quests ?? {})),
        areaName: persistentState.areaName,
        levelNumber: persistentState.levelNumber,
        subtitle: persistentState.subtitle,
      };
    }

    function serializeSessionState() {
      return {
        dialogueTime: 0,
        activeSpeaker: '',
        activeLine: '',
        dialogueMeta: null,
        levelAdvanceQueued: false,
        pushables: serializePushables(pushables ?? []),
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

    async function runPrologueSequence() {
      if (prologuePlayed || !isPrologueLevel()) return false;
      prologuePlayed = true;
      inputSystem?.stop?.();
      hudSystem?.hideInteraction?.();
      await waitForPrologueContinue(PROLOGUE_STEPS);
      state.levelAdvanceQueued = true;
      setTimeout(() => {
        game.advanceToNextMap?.(DEFAULT_LEVEL_ID);
      }, 0);
      return true;
    }

    function syncAmmoHud() {
      hudSystem?.setAmmo?.(playerVitals.ammo ?? 0, playerVitals.maxAmmo ?? 0);
    }

    function setAmmoCount(amount = 0) {
      const safeAmount = Math.max(0, Number.isFinite(amount) ? Math.floor(amount) : 0);
      const safeMax = Number.isFinite(playerVitals.maxAmmo)
        ? Math.max(playerVitals.maxAmmo ?? 0, safeAmount)
        : safeAmount;
      playerVitals.ammo = safeAmount;
      playerVitals.maxAmmo = safeMax;
      syncAmmoHud();
    }

    function addAmmo(amount = 0) {
      if (!Number.isFinite(amount)) return;
      setAmmoCount((playerVitals.ammo ?? 0) + Math.floor(amount));
    }

    function consumeAmmo(amount = 1) {
      const cost = Math.max(1, Math.floor(Number.isFinite(amount) ? amount : 1));
      if ((playerVitals.ammo ?? 0) < cost) return false;
      setAmmoCount((playerVitals.ammo ?? 0) - cost);
      return true;
    }

    function getSwitchOccupants() {
      const entities = [{ x: player?.x ?? 0, y: player?.y ?? 0, size: player?.size ?? TILE }];
      if (Array.isArray(pushables)) {
        entities.push(...pushables);
      }
      return entities;
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
      const carryOverVitals = savedSnapshot?.playerVitals ? null : game.consumeCarryOverVitals?.();
      const mapDimensions = level?.getDimensions?.() ?? {};
      const mapBounds =
        Number.isFinite(mapDimensions.width) && Number.isFinite(mapDimensions.height)
          ? {
              minX: 0,
              minY: 0,
              maxX: mapDimensions.width * TILE,
              maxY: mapDimensions.height * TILE,
            }
          : null;
      placements = level.getActorPlacements();
      player = createPlayer(spriteSheet, placements);
      restorePlayer(player, savedSnapshot?.playerState, placements.playerStart ?? player);
      playerStart = { x: player.x, y: player.y };
      pickups = createPickups(level.getPickupTemplates());
      restorePickups(pickups, savedSnapshot?.pickups, { bounds: mapBounds });
      npcs = createNpcs(spriteSheet, placements);
      restoreNpcs(npcs, savedSnapshot?.npcs);
      pushables = createPushables(placements);
      restorePushables(pushables, savedSnapshot?.sessionState?.pushables, { bounds: mapBounds });
      safes = createSafes(level.config?.interactables ?? {});
      restoreSafes(safes, savedSnapshot?.safes, { bounds: mapBounds });

      if (savedSnapshot?.playerVitals) {
        Object.assign(playerVitals, savedSnapshot.playerVitals);
      } else if (carryOverVitals) {
        Object.assign(playerVitals, carryOverVitals);
      }

      const normalizedMaxAmmo = Number.isFinite(playerVitals.maxAmmo)
        ? Math.max(0, Math.floor(playerVitals.maxAmmo))
        : 0;
      playerVitals.maxAmmo = normalizedMaxAmmo;
      setAmmoCount(playerVitals.ammo ?? 0);

      resetSessionState();
      if (savedSnapshot?.persistentState) {
        Object.assign(persistentState.flags, savedSnapshot.persistentState.flags ?? {});
        Object.assign(persistentState.quests, savedSnapshot.persistentState.quests ?? {});
        persistentState.areaName = savedSnapshot.persistentState.areaName ?? persistentState.areaName;
        persistentState.levelNumber = savedSnapshot.persistentState.levelNumber ?? persistentState.levelNumber;
        persistentState.subtitle = savedSnapshot.persistentState.subtitle ?? persistentState.subtitle;
      }

      level.updatePressureSwitches(getSwitchOccupants());

      state.objectivesCollected = game.objectivesCollected ?? savedSnapshot?.objectivesCollected ?? 0;
      objectivesCollected = state.objectivesCollected;
      restoreProjectiles(savedSnapshot?.projectiles);

      hudSystem = createHudSystem(hudDomRefs);
      game.setHud(hudSystem);
      hudSystem.setObjectives(objectivesCollected, level.getObjectiveTotal());
      hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);
      syncAmmoHud();
      setLevelMeta(level.meta);

      renderInventory(inventory);

      const inventoryElement = documentRoot?.querySelector?.('.inventory') ?? null;
      inventoryToggleButton = documentRoot?.querySelector?.('[data-inventory-toggle]') ?? null;
      questToggleButton = documentRoot?.querySelector?.('[data-quest-toggle]') ?? null;
      let inventoryCollapsed = true;
      let inventoryBindingLabel = '';
      questLogCollapsed = true;
      ({
        safePanel,
        safeForm,
        safeTitle,
        safeDescription,
        safeInput,
        safeSubmit,
        safeCancel,
        safeFeedback,
      } = safeDomRefs || {});
      let activeSafe = null;
      let activeQuiz = null;
      ({
        quizPanel,
        quizTitle,
        quizQuestion,
        quizOptions,
        quizFeedback,
        quizCancel,
      } = quizDomRefs || {});
      const handlePickupCollected = (pickup) => {
        if (pickup.id === 'ammo') {
          const amount = Number.isFinite(pickup.quantity) ? pickup.quantity : 1;
          addAmmo(amount);
        }
      };

      const setSafeFeedback = (messageId, params) => {
        if (!safeFeedback) return;
        if (!messageId) {
          safeFeedback.textContent = '';
          return;
        }
        safeFeedback.textContent = format(messageId, params);
      };

      hideSafePanel = () => {
        if (safePanel) {
          safePanel.classList.add('hidden');
          safePanel.setAttribute('aria-hidden', 'true');
        }
        activeSafe = null;
        setSafeFeedback();
      };

      function grantSafeReward(safe) {
        if (!safe?.reward || safe.rewardClaimed) {
          return { granted: false, note: safe?.emptyNote ?? 'note.safe.empty' };
        }
        const rewardItem = { ...safe.reward };
        const stored = inventory.addItem(rewardItem);
        if (!stored) {
          return {
            granted: false,
            blocked: true,
            note: 'note.safe.inventoryFull',
            params: { item: rewardItem.name ?? rewardItem.id ?? 'loot' },
          };
        }
        safe.rewardClaimed = true;
        renderInventory(inventory);
        return {
          granted: true,
          note: safe.rewardNote ?? 'note.safe.itemReceived',
          params: { item: rewardItem.name ?? rewardItem.id ?? 'loot' },
        };
      }

      function showSafePanel(targetSafe) {
        if (!targetSafe || !safePanel || !safeInput) return;
        activeSafe = targetSafe;
        safePanel.classList.remove('hidden');
        safePanel.setAttribute('aria-hidden', 'false');
        const digits = Math.max(1, targetSafe.codeLength ?? 4);
        if (safeTitle) {
          safeTitle.textContent = targetSafe.name ?? 'Sejf';
        }
        if (safeDescription) {
          safeDescription.textContent = format('note.safe.enterCode', { digits });
        }
        safeInput.value = '';
        safeInput.maxLength = digits;
        safeInput.setAttribute('aria-label', format('note.safe.enterCode', { digits }));
        setSafeFeedback();
        safeInput.focus?.({ preventScroll: true });
      }

      handleSafeSubmit = (event) => {
        event?.preventDefault?.();
        if (!activeSafe) {
          hideSafePanel();
          return;
        }
        const digits = Math.max(1, activeSafe.codeLength ?? 4);
        const entered = (safeInput?.value ?? '').trim();
        const numericEntry = entered.replace(/\D/g, '');
        if (numericEntry.length !== digits) {
          setSafeFeedback('note.safe.enterCode', { digits });
          return;
        }
        const normalized = numericEntry.padStart(digits, '0');
        const expected = (activeSafe.code ?? '').padStart(digits, '0');
        if (normalized !== expected) {
          setSafeFeedback('note.safe.wrongCode');
          return;
        }
        activeSafe.opened = true;
        const rewardResult = grantSafeReward(activeSafe);
        const noteId =
          rewardResult.note ??
          (rewardResult.granted ? 'note.safe.itemReceived' : activeSafe.emptyNote ?? 'note.safe.empty');
        hudSystem.showNote(noteId, rewardResult.params);
        if (rewardResult.blocked) {
          setSafeFeedback(rewardResult.note, rewardResult.params);
          return;
        }
        setSafeFeedback('note.safe.unlocked');
        game.saveProgress?.({ auto: true });
        hideSafePanel();
      };

      function handleSafeInteract(targetSafe) {
        if (!targetSafe) return;
        if (targetSafe.opened) {
          if (targetSafe.reward && !targetSafe.rewardClaimed) {
            const rewardResult = grantSafeReward(targetSafe);
            const noteId = rewardResult.note ?? 'note.safe.itemReceived';
            hudSystem.showNote(noteId, rewardResult.params);
            if (!rewardResult.blocked) {
              game.saveProgress?.({ auto: true });
            }
            return;
          }
          const messageId = targetSafe.emptyNote ?? 'note.safe.empty';
          hudSystem.showNote(messageId);
          return;
        }
        showSafePanel(targetSafe);
      }

      const setQuizFeedback = (messageId, params) => {
        if (!quizFeedback) return;
        if (!messageId) {
          quizFeedback.textContent = '';
          return;
        }
        quizFeedback.textContent = format(messageId, params);
      };

      function clearQuizOptions() {
        if (!quizOptions) return;
        quizOptions.innerHTML = '';
      }

      hideQuizPanel = () => {
        if (quizPanel) {
          quizPanel.classList.add('hidden');
          quizPanel.setAttribute('aria-hidden', 'true');
        }
        sessionState.activeQuiz = null;
        activeQuiz = null;
        setQuizFeedback();
        clearQuizOptions();
      };

      function applyQuizStateChanges(nextState = {}) {
        Object.entries(nextState).forEach(([key, value]) => {
          persistentState.flags[key] = value;
        });
      }

      function applyQuizActions(step) {
        if (!step?.actions && !step?.rewardId) return { success: true, note: step?.note };
        const rewards = level.getRewards();
        const reward = step.rewardId ? rewards?.[step.rewardId] : undefined;
        const baseActions = Array.isArray(step.actions) ? step.actions : step.actions ? [step.actions] : [];
        const rewardActions = reward?.actions ?? [];
        const actions = [...baseActions, ...rewardActions];
        if (!actions.length) {
          return { success: true, note: reward?.note ?? step?.note };
        }
        const result = runActions(
          actions,
          { inventory, renderInventory, level, game, hud: hudSystem, flags: persistentState.flags, persistentState, sessionState, state },
          reward,
        );
        if (result.success !== false && reward?.note && !result.note) {
          result.note = reward.note;
        }
        return result;
      }

      function showQuizPanel(payload = {}) {
        const quiz = payload.quiz ?? payload.line?.quiz;
        if (!quizPanel || !quiz || !quizQuestion || !quizOptions) return;
        activeQuiz = {
          ...payload,
          quiz,
        };
        sessionState.activeQuiz = { id: payload.line?.id ?? payload.npc?.id ?? 'quiz' };
        quizPanel.classList.remove('hidden');
        quizPanel.setAttribute('aria-hidden', 'false');
        if (quizTitle) {
          quizTitle.textContent = payload.npc?.name ?? 'Kvíz';
        }
        quizQuestion.textContent = quiz.question ?? '';
        clearQuizOptions();
        quiz.options?.forEach((option, index) => {
          const button = documentRoot?.createElement?.('button');
          if (!button) return;
          button.type = 'button';
          button.className = 'menu-button';
          button.dataset.quizOption = String(index);
          button.textContent = option.label ?? '';
          quizOptions.appendChild(button);
        });
        setQuizFeedback();
      }

      function handleQuizAnswer(index) {
        if (!activeQuiz) return;
        const quiz = activeQuiz.quiz ?? {};
        const option = quiz.options?.[index];
        if (!option) return;
        if (!option.correct) {
          setQuizFeedback(quiz.failureNote ?? 'note.quiz.wrong');
          return;
        }
        const actionResult = applyQuizActions(activeQuiz.line);
        if (actionResult.success === false) {
          setQuizFeedback(actionResult.blockedNote ?? quiz.failureNote ?? 'note.quiz.inventoryFull');
          return;
        }
        if (activeQuiz.line?.setState) {
          applyQuizStateChanges(activeQuiz.line.setState);
        }
        const note = actionResult.note ?? quiz.successNote ?? activeQuiz.line?.note;
        if (note) {
          hudSystem.showNote(note);
        }
        hideQuizPanel();
        clearDialogueState();
        hudSystem.hideInteraction();
      }

      handleQuizOptionClick = (event) => {
        const target = event?.target?.closest?.('[data-quiz-option]');
        if (!target) return;
        const index = Number.parseInt(target.dataset.quizOption ?? '-1', 10);
        if (!Number.isFinite(index)) return;
        handleQuizAnswer(index);
      };

      handleQuizCancelClick = (event) => {
        event?.preventDefault?.();
        hideQuizPanel();
        clearDialogueState();
        hudSystem.hideInteraction();
      };

      const handleQuizStart = (payload) => {
        if (sessionState.activeQuiz) return;
        showQuizPanel(payload);
      };

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

      function setInventoryCollapsed(collapsed, { silent = false } = {}) {
        inventoryCollapsed = Boolean(collapsed);
        inventoryElement?.classList.toggle('collapsed', inventoryCollapsed);
        inventoryElement?.setAttribute('aria-hidden', inventoryCollapsed ? 'true' : 'false');
        inventoryToggleButton?.setAttribute('aria-pressed', inventoryCollapsed ? 'false' : 'true');
      }

      const toggleInventory = () => setInventoryCollapsed(!inventoryCollapsed);

      const setQuestLogCollapsed = (collapsed) => {
        questLogCollapsed = Boolean(collapsed);
        hudSystem.setQuestVisibility?.(!questLogCollapsed);
      };

      const toggleQuestLog = () => setQuestLogCollapsed(!questLogCollapsed);

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
          case 'toggle-quest-log':
            toggleQuestLog();
            break;
          default:
            break;
        }
      }

      inputSystem = createInputSystem({
        inventorySlots: inventory.slots.length,
        onAction: handleAction,
      });
      inputSystem.init({
        document: documentRoot,
        window: typeof window !== 'undefined' ? window : null,
        inventoryGrid: inventoryElement?.querySelector?.('.inventory-grid') ?? null,
      });

      const bindingConfig = formatControlsHint(inputSystem.getBindings());
      const questBindingLabel = formatBinding(inputSystem.getBindings(), 'toggle-quest-log');
      inventoryBindingLabel = bindingConfig.inventory;
      const controlsHint = {
        ...bindingConfig,
        inventory: format('note.inventory.pinnedShort', { binding: inventoryBindingLabel }),
      };
      hudSystem.setControlsHint(controlsHint);
      hudSystem.setInventoryBindingHint(inventoryBindingLabel);
      hudSystem.setQuestBindingLabel(questBindingLabel);
      setInventoryCollapsed(true, { silent: true });
      hudSystem.showNote('note.inventory.intro', { binding: inventoryBindingLabel });

      handleInventoryToggleClick = (event) => {
        event.preventDefault?.();
        toggleInventory();
      };
      inventoryToggleButton?.addEventListener?.('click', handleInventoryToggleClick);

      handleQuestToggleClick = (event) => {
        event.preventDefault?.();
        toggleQuestLog();
      };
      questToggleButton?.addEventListener?.('click', handleQuestToggleClick);

      safeForm?.addEventListener?.('submit', handleSafeSubmit);
      safeSubmit?.addEventListener?.('click', handleSafeSubmit);
      handleSafeCancelClick = (event) => {
        event?.preventDefault?.();
        hideSafePanel();
      };
      safeCancel?.addEventListener?.('click', handleSafeCancelClick);
      quizOptions?.addEventListener?.('click', handleQuizOptionClick);
      quizCancel?.addEventListener?.('click', handleQuizCancelClick);

      setQuestLogCollapsed(true);

      const combatSystem = createCombatSystem({
        ammo: { consume: consumeAmmo },
        projectiles,
        player,
        tileAt: level.tileAt.bind(level),
        damageTile: level.damageTileAt.bind(level),
        showNote: hudSystem.showNote,
        getTileLayersAt: level.getTileLayersAt.bind(level),
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
        setObjectives: (count) =>
          hudSystem.setObjectives(count ?? state.objectivesCollected, level.getObjectiveTotal()),
        collectNearbyPickups,
        onPickupCollected: handlePickupCollected,
        safes,
        onSafeInteract: handleSafeInteract,
        onQuizStart: handleQuizStart,
      });

      levelScript =
        createRooftopCorridorScript({
          state,
          hud: hudSystem,
          npcs,
          spriteSheet,
          alertLayer,
          level,
          player,
          game,
        }) || null;

      const overlapsEntity = (x1, y1, size1, x2, y2, size2) => {
        const half1 = size1 / 2;
        const half2 = size2 / 2;
        return Math.abs(x1 - x2) < half1 + half2 && Math.abs(y1 - y2) < half1 + half2;
      };

      const findBlockingEntity = (entities = [], size, nx, ny) =>
        entities.find((entity) => overlapsEntity(nx, ny, size, entity.x, entity.y, entity.size ?? size));

      const canMoveWithEntities = (size, nx, ny) =>
        level.canMove(size, nx, ny) &&
        !findBlockingEntity(pushables, size, nx, ny) &&
        !findBlockingEntity(safes, size, nx, ny);

      updateFrame = (dt) => {
        updatePlayer(player, dt, { canMove: level.canMove.bind(level), pushables, blockers: safes });
        level.updatePressureSwitches(getSwitchOccupants());
        level.clampCamera(camera, player, canvas);

        if (playerVitals.invulnerableTime > 0) {
          playerVitals.invulnerableTime = Math.max(0, playerVitals.invulnerableTime - dt);
        }
        if (player.flashTimer > 0) {
          player.flashTimer = Math.max(0, player.flashTimer - dt);
          player.flashVisible = Math.floor(player.flashTimer / 0.08) % 2 === 0;
        } else {
          player.flashVisible = true;
        }

        const { nearestNpc, guardCollision } = updateNpcStates(npcs, player, dt, {
          canMove: canMoveWithEntities,
        });

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
        levelScript?.update?.(dt);

        interactionSystem.updateInteractions(player, {
          ...interactContext,
          dt,
        });
      };

      renderFrame = () => {
        drawGrid(ctx, canvas, getLevelDimensions(), camera);
        level.drawLevel(ctx, camera, spriteSheet);
        level.drawPressureSwitches(ctx, camera);
        level.drawLightSwitches(ctx, camera);
        drawPickups(ctx, camera, pickups, spriteSheet);
        drawPushables(ctx, camera, pushables, spriteSheet);
        drawSafes(ctx, camera, safes, spriteSheet);
        combatSystem.drawProjectiles(ctx, camera);
        drawNpcs(ctx, camera, npcs);
        drawPlayer(ctx, camera, player, spriteSheet);
        level.drawLighting(ctx, camera);
        drawCameraBounds(getLevelDimensions(), camera);
      };

      game.setSnapshotProvider(() => ({
        playerState: serializePlayer(player),
        playerVitals: { ...playerVitals },
        projectiles: projectilesForSave(),
        sessionState: serializeSessionState(),
        persistentState: serializePersistentState(),
        pickups: serializePickups(pickups),
        npcs: serializeNpcs(npcs),
        safes: serializeSafes(safes),
      }));
    }

    function applyDamage({ invulnerability = 0, resetPosition = false, note, deathNote }) {
      if (deathTimeout || playerVitals.health <= 0) return;

      playerVitals.health -= 1;
      playerVitals.invulnerableTime = Math.max(playerVitals.invulnerableTime, invulnerability);
      player.flashTimer = Math.max(player.flashTimer ?? 0, invulnerability || 0.8);
      player.flashVisible = true;
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

    function clearDialogueState() {
      sessionState.dialogueTime = 0;
      sessionState.activeSpeaker = '';
      sessionState.activeLine = '';
      sessionState.dialogueMeta = null;
    }

    function handlePlayerDeath(deathNote) {
      if (deathTimeout) return;
      hudSystem.hideInteraction();
      clearDialogueState();
      const darknessDeath = deathNote === 'note.death.darkness';

      if (darknessDeath) {
        const safeSpot = level.findNearestLitPosition?.(player.x, player.y);
        if (safeSpot) {
          player.x = safeSpot.x;
          player.y = safeSpot.y;
          darknessTimer = 0;
          playerVitals.health = Math.max(1, Math.min(playerVitals.maxHealth || 1, playerVitals.health || 0));
          playerVitals.invulnerableTime = Math.max(playerVitals.invulnerableTime, 1.5);
          player.flashTimer = Math.max(player.flashTimer ?? 0, 1.5);
          player.flashVisible = true;
          hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);
          hudSystem.showNote('note.death.darknessTeleport');
          return;
        }
      }

      hudSystem.showNote(deathNote || 'note.death.darkness');
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

    const noop = () => {};
    let updateFrame = noop;
    let renderFrame = noop;

    function pauseSession() {
      resetActionQueue();
      hideSafePanel();
      hideQuizPanel();
      inputSystem?.stop?.();
    }

    function resumeSession() {
      hidePausePanel();
      resetActionQueue();
      inputSystem?.start?.();
    }

    function cleanup() {
      inputSystem?.destroy?.();
      if (deathTimeout) {
        clearTimeout(deathTimeout);
        deathTimeout = null;
      }
      levelScript?.destroy?.();
      levelScript = null;
      game.setSnapshotProvider(null);
      hudSystem?.hideToast?.();
      inventoryToggleButton?.removeEventListener?.('click', handleInventoryToggleClick);
      questToggleButton?.removeEventListener?.('click', handleQuestToggleClick);
      safeForm?.removeEventListener?.('submit', handleSafeSubmit);
      safeSubmit?.removeEventListener?.('click', handleSafeSubmit);
      safeCancel?.removeEventListener?.('click', handleSafeCancelClick);
      quizOptions?.removeEventListener?.('click', handleQuizOptionClick);
      quizCancel?.removeEventListener?.('click', handleQuizCancelClick);
      hideSafePanel();
      hideQuizPanel();
    }

    return {
      bootstrap,
      pause: pauseSession,
      resume: resumeSession,
      cleanup,
      runIntro: () => runPrologueSequence(),
      manualSave,
      getCarryOverVitals: () => ({
        ammo: playerVitals.ammo ?? 0,
        maxAmmo: playerVitals.maxAmmo ?? 0,
      }),
      updateFrame: (dt) => updateFrame(dt),
      renderFrame: () => renderFrame(),
      levelId: () => level?.meta?.id ?? levelId ?? DEFAULT_LEVEL_ID,
    };
  }

  let currentInGameSession = null;

  registerScene('menu', {
    async onEnter() {
      setFullscreenAvailability(isFullscreenSupported);
      showMenuPanel();
    },
    onRender() {
      ctx.fillStyle = COLORS.gridBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  });

  registerScene('loading', {
    async onEnter({ params }) {
      setFullscreenAvailability(true);
      const loadStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();
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

      const targetLevelId = params?.levelId || game.currentLevelId || DEFAULT_LEVEL_ID;
      const targetConfig = await loadLevelConfig(targetLevelId);
      const resolvedLevelId = targetConfig.meta?.id || targetLevelId;
      const targetMeta = getLevelMeta(targetConfig);
      showLoadingPanel(
        format('loading.transition', { name: targetMeta.title ?? targetMeta.name ?? resolvedLevelId }),
      );
      const nextLevelId = resolvedLevelId;
      currentInGameSession?.cleanup?.();
      currentInGameSession = createInGameSession(nextLevelId);
      await currentInGameSession.bootstrap();
      const minLoadDuration = 600;
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loadStarted;
      if (elapsed < minLoadDuration) {
        await new Promise((resolve) => setTimeout(resolve, minLoadDuration - elapsed));
      }

      if (params?.waitForContinue) {
        const continueTitleText = format('hud.levelTitle', {
          name: targetMeta.title ?? targetMeta.name ?? resolvedLevelId,
          level: targetMeta.levelNumber ?? 0,
        });
        const continueSubtitleText = format('loading.ready', {
          name: targetMeta.title ?? targetMeta.name ?? resolvedLevelId,
        });
        await waitForContinuePrompt({
          title: continueTitleText,
          subtitle: continueSubtitleText,
          detail: format('loading.pressAnyKey'),
        });
      }
      hideAllPanels();
      await setScene('inGame');
    },
    onRender() {
      ctx.fillStyle = COLORS.gridBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  });

  registerScene('inGame', {
    async onEnter() {
      hideAllPanels();
      setFullscreenAvailability(true);
      const introAdvanced = Boolean(await currentInGameSession?.runIntro?.());
      if (!introAdvanced) {
        currentInGameSession?.resume?.();
      }
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
    onUpdate(dt) {
      currentInGameSession?.updateFrame?.(dt);
    },
    onRender() {
      currentInGameSession?.renderFrame?.();
    },
  });

  registerScene('pause', {
    async onEnter() {
      showPausePanel();
    },
    async onExit() {
      hidePausePanel();
    },
    onRender() {
      currentInGameSession?.renderFrame?.();
    },
  });

  menuNewGameButton?.addEventListener('click', () => showMenuScreen('new-game'));
  menuContinueButton?.addEventListener('click', () => {
    refreshSaveSlotList();
    showMenuScreen('continue');
  });
  menuLevelsButton?.addEventListener('click', async () => {
    await refreshLevelList();
    showMenuScreen('levels');
  });
  settingsButton?.addEventListener('click', () => showMenuScreen('settings'));
  menuContinueLatestButton?.addEventListener('click', () => {
    const saves = game.listSaves();
    const latest = saves[0];
    if (latest) {
      setScene('loading', { levelId: latest.currentLevelId, slotId: latest.slotId, loadSlot: true });
      return;
    }
    setScene('loading', { levelId: game.currentLevelId ?? DEFAULT_LEVEL_ID, slotId: resolveSlotId() });
  });
  menuBackButtons?.forEach((button) => {
    button.addEventListener('click', () => showMenuScreen('main'));
  });
  startButton?.addEventListener('click', () =>
    setScene('loading', { levelId: PROLOGUE_LEVEL_ID, slotId: resolveSlotId(), freshStart: true }),
  );
  pauseResumeButton?.addEventListener('click', () => {
    if (pausePanel?.classList.contains('hidden')) {
      togglePauseScene();
    } else {
      resume();
    }
  });
  pauseRestartButton?.addEventListener('click', () => restartLevelFromPause());
  pauseSaveButton?.addEventListener('click', () => currentInGameSession?.manualSave?.());
  pauseMenuButton?.addEventListener('click', () => showMenu());

  game.onReturnToMenu(() => {
    showMenu();
    setFullscreenAvailability(isFullscreenSupported);
    refreshSaveSlotList();
  });
  game.onAdvanceToMap((nextLevelId) => {
    const carryOverVitals = currentInGameSession?.getCarryOverVitals?.();
    if (carryOverVitals) {
      game.setCarryOverVitals?.(carryOverVitals);
    }
    if (nextLevelId) {
      setScene('loading', { levelId: nextLevelId, waitForContinue: true });
      return;
    }
    showMenu();
  });

  return {
    start: () => setScene('menu'),
  };
}
