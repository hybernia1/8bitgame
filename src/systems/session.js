import { COLORS, TILE, WORLD } from '../core/constants.js';
import { formatControlsHint } from '../core/input-bindings.js';
import { createCombatSystem } from './combat.js';
import { createHudSystem } from './hud.js';
import { createInputSystem } from './input.js';
import { createInteractionSystem } from './interactions.js';
import { registerScene, resume, setScene, showMenu } from '../core/scenes.js';
import { format } from '../ui/messages.js';
import { renderInventory, useInventorySlot } from '../ui/inventory.js';
import { DEFAULT_LEVEL_ID, getLevelConfig, getLevelMeta, loadLevelConfig } from '../world/level-data.js';
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
import {
  createNpcs,
  drawNpcs,
  restoreNpcs,
  serializeNpcs,
  updateNpcStates,
} from '../entities/npc.js';
import { createRooftopCorridorScript } from '../data/levels/3-rooftop-corridor-script.js';

const PROLOGUE_STEPS = [
  {
    title: 'Návrat snu',
    actionLabel: 'Probudit se',
    body: [
      'Zase se mi vrací sen o rodině – dětský smích, ruce, které už nedržím, a pak jen ticho prořezané sirénou.',
      'Probudím se s hlavou těžkou od léků, které mají ty obrazy utlumit. Ale místo klidu cítím jen stín, který mě žene dál.',
    ],
  },
  {
    title: 'Telefonát ve tmě',
    actionLabel: 'Vyrazit do vesnice',
    body: [
      'Telefon zazvoní uprostřed noci. Starostka Hana sotva skrývá paniku: během měsíce zmizely tři děti a policie tápe.',
      '„Potřebuju tě,“ šeptá. „Všechny stopy vedou k opuštěné laboratoři na kopci.“ Přijímám bez váhání – i kdybych měl znovu otevřít rány, které nikdy nezmizely.',
    ],
  },
];

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
    healthHeartsEl: root.querySelector('[data-health-hearts]'),
    healthCurrentEl: root.querySelector('.hud-health-current'),
    healthTotalEl: root.querySelector('.hud-health-total'),
    ammoEl: root.querySelector('[data-ammo]'),
    ammoCurrentEl: root.querySelector('[data-ammo-count]'),
    inventoryNote: root.querySelector('[data-inventory-note]'),
    inventoryBinding: root.querySelector('[data-inventory-binding]'),
    inventoryStatus: root.querySelector('[data-inventory-status]'),
    toast: root.querySelector('.hud-toast'),
    banner: root.querySelector('.interaction-banner'),
    bannerTitle: root.querySelector('.interaction-title'),
    bannerBody: root.querySelector('.interaction-text'),
    bannerAvatar: root.querySelector('[data-dialogue-avatar]'),
    pauseBindings: root.querySelector('[data-pause-bindings]'),
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

  const defaultMenuSubtitle =
    'Zvol si novou misi, načti poslední save, nebo skoč na konkrétní level.';

  const {
    documentRoot,
    menuPanel,
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
    levelSelectInput,
    slotInput,
    menuSubtitle,
    saveSlotList,
    startButton,
    continueButton,
    selectButton,
    settingsButton,
    pauseResumeButton,
    pauseSaveButton,
    pauseMenuButton,
    alertLayer,
    setFullscreenAvailability,
    fullscreenSupported,
  } = shell;

  const isFullscreenSupported = Boolean(fullscreenSupported);

  if (levelSelectInput) {
    levelSelectInput.value = levelSelectInput.placeholder || DEFAULT_LEVEL_ID;
  }
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
    setFullscreenAvailability(isFullscreenSupported);
    shell.showFullscreenPrompt?.();
    refreshSaveSlotList();
    hideContinuePanel();
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

  function renderPrologueStep(index = 0) {
    const step = PROLOGUE_STEPS[index] ?? PROLOGUE_STEPS[0];
    const total = PROLOGUE_STEPS.length;
    if (prologueStepTitle) {
      prologueStepTitle.textContent = step?.title ?? 'Prolog';
    }
    if (prologueProgress) {
      prologueProgress.textContent = `${Math.min(index + 1, total)} / ${total}`;
    }
    if (prologueContinueButton && step?.actionLabel) {
      prologueContinueButton.textContent = step.actionLabel;
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

  function waitForPrologueContinue() {
    if (!prologuePanel) return Promise.resolve();
    let stepIndex = 0;
    renderPrologueStep(stepIndex);
    showProloguePanel();

    const updateNav = () => {
      const step = PROLOGUE_STEPS[stepIndex];
      const isLast = stepIndex >= PROLOGUE_STEPS.length - 1;
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
        if (nextIndex >= PROLOGUE_STEPS.length) {
          cleanup();
          return;
        }
        stepIndex = nextIndex;
        renderPrologueStep(stepIndex);
        updateNav();
      };
      const keyHandler = (event) => {
        if (event.key === 'Tab') return;
        if (event.key === 'ArrowLeft') {
          advance(-1);
        } else if (event.key === 'ArrowRight') {
          advance(1);
        } else if (event.key === 'Enter' || event.key === ' ') {
          if (stepIndex >= PROLOGUE_STEPS.length - 1) {
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

  function drawCameraBounds({ width, height }) {
    ctx.strokeStyle = COLORS.gridBorder;
    ctx.strokeRect(1, 1, width * TILE - 2, height * TILE - 2);
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
      levelAdvanceQueued: false,
    };

    function resetSessionState() {
      sessionState.dialogueTime = 0;
      sessionState.activeSpeaker = '';
      sessionState.activeLine = '';
      sessionState.dialogueMeta = null;
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
    let spriteSheet = null;
    let savedSnapshot = null;
    let interactQueued = false;
    let shootQueued = false;

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
      placements = level.getActorPlacements();
      player = createPlayer(spriteSheet, placements);
      restorePlayer(player, savedSnapshot?.playerState, placements.playerStart ?? player);
      playerStart = { x: player.x, y: player.y };
      pickups = createPickups(level.getPickupTemplates());
      restorePickups(pickups, savedSnapshot?.pickups);
      npcs = createNpcs(spriteSheet, placements);
      restoreNpcs(npcs, savedSnapshot?.npcs);
      pushables = createPushables(placements);
      restorePushables(pushables, savedSnapshot?.sessionState?.pushables);

      if (savedSnapshot?.playerVitals) {
        Object.assign(playerVitals, savedSnapshot.playerVitals);
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
      hudSystem.showNote('note.inventory.intro');
      hudSystem.setObjectives(objectivesCollected, level.getObjectiveTotal());
      hudSystem.setHealth(playerVitals.health, playerVitals.maxHealth);
      syncAmmoHud();
      setLevelMeta(level.meta);

      renderInventory(inventory);

      const inventoryElement = documentRoot?.querySelector?.('.inventory') ?? null;

      const handlePickupCollected = (pickup) => {
        if (pickup.id === 'ammo') {
          const amount = Number.isFinite(pickup.quantity) ? pickup.quantity : 1;
          addAmmo(amount);
        }
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

      function pinInventory(bindingLabel) {
        inventoryElement?.classList.remove('collapsed');
        inventoryElement?.setAttribute('aria-hidden', 'false');
        hudSystem.setInventoryStatus(false, bindingLabel);
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
            hudSystem.showNote('note.inventory.pinnedStatus');
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

      const controlsHint = formatControlsHint(inputSystem.getBindings());
      controlsHint.inventory = format('note.inventory.pinnedShort');
      hudSystem.setControlsHint(controlsHint);
      hudSystem.setInventoryBindingHint(controlsHint.inventory);
      pinInventory(controlsHint.inventory);

      const combatSystem = createCombatSystem({
        ammo: { consume: consumeAmmo },
        projectiles,
        player,
        tileAt: level.tileAt.bind(level),
        damageTile: level.damageTileAt.bind(level),
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
        setObjectives: (count) =>
          hudSystem.setObjectives(count ?? state.objectivesCollected, level.getObjectiveTotal()),
        collectNearbyPickups,
        onPickupCollected: handlePickupCollected,
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

      updateFrame = (dt) => {
        updatePlayer(player, dt, { canMove: level.canMove.bind(level), pushables });
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
        levelScript?.update?.(dt);

        interactionSystem.updateInteractions(player, {
          ...interactContext,
          dt,
        });
      };

      renderFrame = () => {
        drawGrid(ctx, canvas, getLevelDimensions());
        level.drawLevel(ctx, camera, spriteSheet);
        level.drawPressureSwitches(ctx, camera);
        level.drawLightSwitches(ctx, camera);
        drawPickups(ctx, camera, pickups, spriteSheet);
        drawPushables(ctx, camera, pushables, spriteSheet);
        combatSystem.drawProjectiles(ctx, camera);
        drawNpcs(ctx, camera, npcs);
        drawPlayer(ctx, camera, player, spriteSheet);
        level.drawLighting(ctx, camera);
        drawCameraBounds(getLevelDimensions());
      };

      game.setSnapshotProvider(() => ({
        playerState: serializePlayer(player),
        playerVitals: { ...playerVitals },
        projectiles: projectilesForSave(),
        sessionState: serializeSessionState(),
        persistentState: serializePersistentState(),
        pickups: serializePickups(pickups),
        npcs: serializeNpcs(npcs),
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

    function handlePlayerDeath(deathNote) {
      if (deathTimeout) return;
      hudSystem.hideInteraction();
      hudSystem.showNote(deathNote || 'note.death.darkness');
      sessionState.dialogueTime = 0;
      sessionState.activeSpeaker = '';
      sessionState.activeLine = '';
      sessionState.dialogueMeta = null;
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
    }

    return {
      bootstrap,
      pause: pauseSession,
      resume: resumeSession,
      cleanup,
      manualSave,
      updateFrame: (dt) => updateFrame(dt),
      renderFrame: () => renderFrame(),
      levelId: () => level?.meta?.id ?? levelId ?? DEFAULT_LEVEL_ID,
    };
  }

  let currentInGameSession = null;

  registerScene('menu', {
    async onEnter() {
      setFullscreenAvailability(isFullscreenSupported);
      shell.showFullscreenPrompt?.();
      showMenuPanel();
    },
    onRender() {
      ctx.fillStyle = COLORS.gridBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  });

  registerScene('prologue', {
    async onEnter({ params }) {
      setFullscreenAvailability(isFullscreenSupported);
      const targetParams = {
        levelId: params?.levelId || DEFAULT_LEVEL_ID,
        slotId: params?.slotId || resolveSlotId(),
        freshStart: params?.freshStart ?? true,
      };
      await waitForPrologueContinue();
      await setScene('loading', targetParams);
    },
    async onExit() {
      hideProloguePanel();
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

      const targetLevelId = params?.levelId || game.currentLevelId || levelSelectInput?.value || DEFAULT_LEVEL_ID;
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
      currentInGameSession?.resume?.();
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

  startButton?.addEventListener('click', () =>
    setScene('prologue', { levelId: DEFAULT_LEVEL_ID, slotId: resolveSlotId(), freshStart: true }),
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
    setScene('prologue', { levelId: chosen, slotId: resolveSlotId(), freshStart: true });
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
    setFullscreenAvailability(isFullscreenSupported);
    refreshSaveSlotList();
  });
  game.onAdvanceToMap((nextLevelId) => {
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
