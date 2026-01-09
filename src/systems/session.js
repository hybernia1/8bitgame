import { COLORS, TILE } from '../core/constants.js';
import { INPUT_ACTIONS } from '../core/input-actions.js';
import { formatBinding, formatControlsHint } from '../core/input-bindings.js';
import { createCombatSystem } from './combat.js';
import { createHudSystem } from './hud.js';
import { createInputSystem } from './input.js';
import { createInteractionSystem } from './interactions.js';
import { registerScene, resume, setScene, showMenu } from '../core/scenes.js';
import { format } from '../ui/messages.js';
import { renderInventory, useInventorySlot } from '../ui/inventory.js';
import { createQuizPanel } from '../ui/quiz-panel.js';
import { createSafePanel } from '../ui/safe-panel.js';
import {
  DEFAULT_LEVEL_ID,
  getLevelConfig,
  getLevelMeta,
  loadLevelConfig,
  loaderRegistry,
  registry,
} from '../world/level-data.js';
import {
  LevelInstance,
  drawCameraBounds,
  drawGrid,
  getLevelDimensions as resolveLevelDimensions,
} from '../world/level-instance.js';
import { overlapsEntity } from '../utils/geometry.js';
import { getItemHandlers } from '../data/items/index.js';
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
import { createRooftopCorridorScript } from '../data/levels/3-rooftop-corridor/script.js';

const itemHandlers = getItemHandlers();
const INTRO_LEVEL_ID = 'level-0-prologue';

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

function toggleVisibility(element, visible) {
  if (!element) return;
  element.classList.toggle('hidden', !visible);
}

function setGameUiVisible(shell, visible) {
  shell?.classList.toggle('ui-hidden', !visible);
}

function renderMapOnly(ctx, canvas, level, camera, spriteSheet) {
  if (!level || !spriteSheet) return;
  const levelDimensions = resolveLevelDimensions(level);
  drawGrid(ctx, canvas, levelDimensions, camera);
  level.drawLevel(ctx, camera, spriteSheet);
  level.drawPressureSwitches(ctx, camera);
  level.drawLightSwitches(ctx, camera);
  level.drawLighting(ctx, camera);
  drawCameraBounds(ctx, levelDimensions, camera);
}

function formatSaveDate(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('cs-CZ', { hour12: false });
  } catch {
    return '';
  }
}

const MENU_SCREENS = {
  MAIN: 'main',
  NEW_GAME: 'new-game',
  CONTINUE: 'continue',
  LEVELS: 'levels',
  SETTINGS: 'settings',
};

const MENU_TITLES = {
  [MENU_SCREENS.MAIN]: 'Hlavní menu',
  [MENU_SCREENS.NEW_GAME]: 'Nová hra',
  [MENU_SCREENS.CONTINUE]: 'Pokračovat',
  [MENU_SCREENS.LEVELS]: 'Výběr levelu',
  [MENU_SCREENS.SETTINGS]: 'Nastavení',
};

const MENU_SUBTITLES = {
  [MENU_SCREENS.LEVELS]: 'Vyber úroveň a spusť novou hru.',
  [MENU_SCREENS.SETTINGS]: 'Nastavení budou brzy dostupná.',
};

export function createSessionSystem({ canvas, ctx, game, inventory, spriteSheetPromise, shell }) {
  const hudDomRefs = getHudDomRefs(shell.documentRoot);
  const safePanelController = createSafePanel({ documentRoot: shell.documentRoot });
  const quizPanelController = createQuizPanel({ documentRoot: shell.documentRoot });
  let inventoryToggleButton = null;
  let handleInventoryToggleClick = null;
  let questToggleButton = null;
  let handleQuestToggleClick = null;
  let questLogCollapsed = true;
  let menuMapLevel = null;
  let menuMapSpriteSheet = null;
  const menuMapCamera = { x: 0, y: 0 };

  const {
    documentRoot,
    loadingPanel,
    continuePanel,
    continueTitle,
    continueSubtitle,
    continueDetail,
    cutscenePanel,
    cutsceneContinueButton,
    cutsceneBackButton,
    cutsceneSkipButton,
    cutsceneMedia,
    cutsceneImage,
    cutsceneStepTitle,
    cutsceneStepBody,
    cutsceneProgress,
    cutsceneAvatar,
    cutsceneSpeaker,
    cutsceneKicker,
    gameShell,
    alertLayer,
    setFullscreenAvailability,
    fullscreenSupported,
  } = shell;

  const isFullscreenSupported = Boolean(fullscreenSupported);
  const menuState = {
    screen: MENU_SCREENS.MAIN,
    selectionIndex: 0,
    scrollIndex: 0,
    slotId: 'slot-1',
    editingSlot: false,
    items: [],
    buttonRects: [],
    levelEntries: [],
    saveEntries: [],
  };
  const pauseState = {
    selectionIndex: 0,
    scrollIndex: 0,
    buttonRects: [],
    items: [],
  };
  let menuKeyHandler = null;
  let menuClickHandler = null;
  let activeMenuMode = null;

  function resolveSlotId() {
    return menuState.slotId.trim() || 'slot-1';
  }

  function setSlotInputValue(value) {
    if (!value) return;
    menuState.slotId = value;
  }

  async function ensureMenuMapLevel() {
    if (menuMapLevel && menuMapSpriteSheet) return;
    menuMapSpriteSheet = await spriteSheetPromise;
    const config = await loadLevelConfig(INTRO_LEVEL_ID);
    menuMapLevel = new LevelInstance(config);
    const levelDimensions = resolveLevelDimensions(menuMapLevel);
    const center = {
      x: (levelDimensions.width * TILE) / 2,
      y: (levelDimensions.height * TILE) / 2,
    };
    menuMapLevel.clampCamera(menuMapCamera, center, canvas);
  }

  async function showMenuScreen(screenName) {
    menuState.screen = screenName;
    menuState.selectionIndex = 0;
    menuState.scrollIndex = 0;
    menuState.editingSlot = false;
    if (screenName === MENU_SCREENS.CONTINUE) {
      refreshSaveSlotList();
    }
    if (screenName === MENU_SCREENS.LEVELS) {
      await refreshLevelList();
    }
  }

  function getKnownLevelIds() {
    return [
      ...new Set([DEFAULT_LEVEL_ID, ...registry.keys(), ...loaderRegistry.keys()].filter(Boolean)),
    ];
  }

  async function refreshLevelList() {
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

    menuState.levelEntries = sortedEntries;
  }

  function refreshSaveSlotList() {
    menuState.saveEntries = game.listSaves();
  }

  function setActiveSlot(slotId, { resetProgress = false } = {}) {
    const target = slotId || resolveSlotId();
    game.setSaveSlot(target, { resetProgress });
    setSlotInputValue(target);
    return target;
  }

  function buildMenuItems() {
    switch (menuState.screen) {
      case MENU_SCREENS.NEW_GAME:
        return [
          {
            id: 'slot',
            label: `Slot: ${resolveSlotId()}`,
            type: 'input',
          },
          {
            id: 'start',
            label: 'Spustit',
            action: () =>
              setScene('loading', {
                levelId: INTRO_LEVEL_ID,
                slotId: resolveSlotId(),
                freshStart: true,
              }),
          },
          {
            id: 'back',
            label: '← Zpět',
            variant: 'ghost',
            action: () => showMenuScreen(MENU_SCREENS.MAIN),
          },
        ];
      case MENU_SCREENS.CONTINUE: {
        const items = [
          {
            id: 'continue-latest',
            label: 'Pokračovat z posledního savu',
            action: () => {
              const latest = menuState.saveEntries?.[0];
              if (latest) {
                setScene('loading', {
                  levelId: latest.currentLevelId,
                  slotId: latest.slotId,
                  loadSlot: true,
                });
                return;
              }
              setScene('loading', {
                levelId: game.currentLevelId ?? DEFAULT_LEVEL_ID,
                slotId: resolveSlotId(),
              });
            },
          },
        ];

        if (!menuState.saveEntries.length) {
          items.push({
            id: 'empty',
            label: format('menu.save.empty'),
            disabled: true,
            variant: 'subtle',
          });
        } else {
          menuState.saveEntries.forEach((save) => {
            const levelMeta = getLevelMeta(getLevelConfig(save.currentLevelId ?? DEFAULT_LEVEL_ID));
            const levelName = levelMeta.title ?? levelMeta.name ?? save.currentLevelId ?? 'Neznámý sektor';
            const timestamp = formatSaveDate(save.savedAt);
            const meta = `${levelName}${timestamp ? ` · ${timestamp}` : ''}`;
            items.push({
              id: `load-${save.slotId}`,
              label: `Načíst ${save.slotId}`,
              subLabel: meta,
              action: () => {
                setSlotInputValue(save.slotId);
                setScene('loading', {
                  levelId: save.currentLevelId,
                  slotId: save.slotId,
                  loadSlot: true,
                });
              },
            });
            items.push({
              id: `delete-${save.slotId}`,
              label: `Smazat ${save.slotId}`,
              subLabel: meta,
              variant: 'ghost',
              action: () => {
                game.deleteSave(save.slotId);
                refreshSaveSlotList();
              },
            });
          });
        }

        items.push({
          id: 'back',
          label: '← Zpět',
          variant: 'ghost',
          action: () => showMenuScreen(MENU_SCREENS.MAIN),
        });
        return items;
      }
      case MENU_SCREENS.LEVELS: {
        const items = [];
        if (!menuState.levelEntries.length) {
          items.push({
            id: 'empty',
            label: 'Žádné levely nejsou k dispozici.',
            disabled: true,
            variant: 'subtle',
          });
        } else {
          menuState.levelEntries.forEach((entry) => {
            items.push({
              id: `level-${entry.id}`,
              label: Number.isFinite(entry.levelNumber)
                ? `Level ${entry.levelNumber}: ${entry.title}`
                : entry.title,
              action: () =>
                setScene('loading', { levelId: entry.id, slotId: resolveSlotId(), freshStart: true }),
            });
          });
        }
        items.push({
          id: 'back',
          label: '← Zpět',
          variant: 'ghost',
          action: () => showMenuScreen(MENU_SCREENS.MAIN),
        });
        return items;
      }
      case MENU_SCREENS.SETTINGS:
        return [
          {
            id: 'back',
            label: '← Zpět',
            variant: 'ghost',
            action: () => showMenuScreen(MENU_SCREENS.MAIN),
          },
        ];
      case MENU_SCREENS.MAIN:
      default:
        return [
          { id: 'new-game', label: 'Nová hra', action: () => showMenuScreen(MENU_SCREENS.NEW_GAME) },
          { id: 'continue', label: 'Pokračovat', action: () => showMenuScreen(MENU_SCREENS.CONTINUE) },
          { id: 'levels', label: 'Výběr levelu', action: () => showMenuScreen(MENU_SCREENS.LEVELS) },
          { id: 'settings', label: 'Nastavení', action: () => showMenuScreen(MENU_SCREENS.SETTINGS) },
        ];
    }
  }

  function buildPauseItems() {
    return [
      {
        id: 'resume',
        label: 'Pokračovat',
        action: () => resume(),
      },
      {
        id: 'restart',
        label: 'Restartovat úroveň',
        action: () => restartLevelFromPause(),
      },
      {
        id: 'save',
        label: 'Uložit ručně',
        action: () => currentInGameSession?.manualSave?.(),
      },
      {
        id: 'menu',
        label: 'Hlavní menu',
        variant: 'ghost',
        action: () => showMenu(),
      },
    ];
  }

  function fitTextToWidth(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let trimmed = text;
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}…`;
  }

  function drawMenuOverlay({
    title,
    subtitle,
    items,
    state,
    showSlotHint = false,
  } = {}) {
    const overlayAlpha = 0.6;
    const panelPadding = Math.max(18, Math.round(TILE * 0.5));
    const panelWidth = Math.round(canvas.width * 0.72);
    const panelHeight = Math.round(canvas.height * 0.78);
    const panelX = Math.round((canvas.width - panelWidth) / 2);
    const panelY = Math.round((canvas.height - panelHeight) / 2);
    const headingSize = Math.max(20, Math.round(TILE * 0.6));
    const subtitleSize = Math.max(14, Math.round(TILE * 0.32));
    const itemSize = Math.max(16, Math.round(TILE * 0.34));
    const itemHeight = Math.max(32, Math.round(TILE * 0.8));
    const itemGap = Math.max(10, Math.round(TILE * 0.2));
    const hintSize = Math.max(12, Math.round(TILE * 0.28));
    const colors = {
      overlay: `rgba(0, 0, 0, ${overlayAlpha})`,
      panel: '#241610',
      border: '#4a2f22',
      text: '#f1e2cf',
      muted: 'rgba(241, 226, 207, 0.55)',
      button: '#2f1e16',
      buttonActive: '#4a2f22',
      buttonBorder: '#7a5a3b',
      buttonText: '#f8e7cf',
      ghostText: '#c9a577',
    };

    ctx.save();
    ctx.fillStyle = colors.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = Math.max(2, Math.round(TILE * 0.06));
    ctx.beginPath();
    ctx.rect(panelX, panelY, panelWidth, panelHeight);
    ctx.fill();
    ctx.stroke();

    const contentX = panelX + panelPadding;
    let cursorY = panelY + panelPadding;
    const contentWidth = panelWidth - panelPadding * 2;

    ctx.font = `${headingSize}px sans-serif`;
    ctx.fillStyle = colors.heading;
    ctx.fillText(title ?? '', contentX, cursorY + headingSize);
    cursorY += headingSize + itemGap;

    if (subtitle) {
      ctx.font = `${subtitleSize}px sans-serif`;
      ctx.fillStyle = colors.text;
      wrapTextLines(ctx, subtitle, contentWidth).forEach((line) => {
        ctx.fillText(line, contentX, cursorY + subtitleSize);
        cursorY += subtitleSize + Math.round(subtitleSize * 0.4);
      });
      cursorY += Math.round(itemGap * 0.4);
    }

    const listTop = cursorY;
    const listHeight = panelY + panelHeight - panelPadding - listTop;
    const maxVisible = Math.max(1, Math.floor((listHeight + itemGap) / (itemHeight + itemGap)));

    if (state.selectionIndex < 0) {
      state.selectionIndex = 0;
    } else if (state.selectionIndex >= items.length) {
      state.selectionIndex = Math.max(0, items.length - 1);
    }

    if (state.selectionIndex < state.scrollIndex) {
      state.scrollIndex = state.selectionIndex;
    } else if (state.selectionIndex >= state.scrollIndex + maxVisible) {
      state.scrollIndex = Math.max(0, state.selectionIndex - maxVisible + 1);
    }

    const visibleItems = items.slice(state.scrollIndex, state.scrollIndex + maxVisible);
    state.buttonRects = [];
    state.items = items;

    visibleItems.forEach((item, offset) => {
      const index = state.scrollIndex + offset;
      const x = contentX;
      const y = listTop + offset * (itemHeight + itemGap);
      const rect = { x, y, width: contentWidth, height: itemHeight, index };
      const isSelected = index === state.selectionIndex;
      const isDisabled = Boolean(item.disabled);
      const isGhost = item.variant === 'ghost';
      const isInput = item.type === 'input';
      const isEditing = isInput && menuState.editingSlot;

      ctx.fillStyle = isSelected ? colors.buttonActive : colors.button;
      ctx.strokeStyle = colors.buttonBorder;
      ctx.lineWidth = Math.max(1, Math.round(TILE * 0.03));
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.fill();
      ctx.stroke();

      ctx.font = `${itemSize}px sans-serif`;
      ctx.fillStyle = isDisabled ? colors.muted : isGhost ? colors.ghostText : colors.buttonText;
      const label = isInput && isEditing ? `${item.label} ▌` : item.label;
      const labelText = fitTextToWidth(ctx, label ?? '', rect.width - panelPadding * 2);
      ctx.fillText(labelText, rect.x + panelPadding, rect.y + itemHeight / 2 + itemSize / 3);

      if (item.subLabel) {
        ctx.font = `${Math.round(itemSize * 0.78)}px sans-serif`;
        ctx.fillStyle = colors.muted;
        const subText = fitTextToWidth(ctx, item.subLabel, rect.width - panelPadding * 2);
        ctx.fillText(subText, rect.x + panelPadding, rect.y + itemHeight - itemSize * 0.2);
      }

      state.buttonRects.push(rect);
    });

    if (showSlotHint) {
      ctx.font = `${hintSize}px sans-serif`;
      ctx.fillStyle = colors.muted;
      const hint = menuState.editingSlot
        ? 'Zadej ID slotu, Enter potvrdí.'
        : 'Enter upraví slot, šipkami vyber.';
      ctx.fillText(hint, contentX, panelY + panelHeight - panelPadding * 0.6);
    }

    ctx.restore();
  }

  function activateMenuItem(state, item) {
    if (!item || item.disabled) return;
    if (item.type === 'input') {
      menuState.editingSlot = !menuState.editingSlot;
      return;
    }
    menuState.editingSlot = false;
    item.action?.();
  }

  function handleMenuNavigation(state, direction) {
    if (!state.items.length) return;
    state.selectionIndex = (state.selectionIndex + direction + state.items.length) % state.items.length;
  }

  function handleMenuKey(event) {
    if (!activeMenuMode) return;
    const isPause = activeMenuMode === 'pause';
    const state = isPause ? pauseState : menuState;

    if (!isPause && menuState.editingSlot) {
      if (event.key === 'Enter') {
        menuState.editingSlot = false;
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        menuState.editingSlot = false;
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace') {
        menuState.slotId = menuState.slotId.slice(0, -1);
        event.preventDefault();
        return;
      }
      if (event.key.length === 1 && /[a-z0-9_-]/i.test(event.key)) {
        menuState.slotId = `${menuState.slotId}${event.key}`.slice(0, 24);
        event.preventDefault();
        return;
      }
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        handleMenuNavigation(state, -1);
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handleMenuNavigation(state, 1);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        activateMenuItem(state, state.items[state.selectionIndex]);
        event.preventDefault();
        break;
      case 'Escape':
      case 'Backspace':
        if (isPause) {
          resume();
        } else if (menuState.screen !== MENU_SCREENS.MAIN) {
          showMenuScreen(MENU_SCREENS.MAIN);
        }
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  function handleMenuClick(event) {
    if (!activeMenuMode || !canvas) return;
    const isPause = activeMenuMode === 'pause';
    const state = isPause ? pauseState : menuState;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const hit = state.buttonRects.find((button) => {
      if (!button) return false;
      return x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height;
    });
    if (!hit) return;
    state.selectionIndex = hit.index;
    activateMenuItem(state, state.items[hit.index]);
  }

  function enableMenuInput(mode) {
    if (!canvas) return;
    activeMenuMode = mode;
    const doc = documentRoot?.ownerDocument ?? document;
    menuKeyHandler = (event) => handleMenuKey(event);
    menuClickHandler = (event) => handleMenuClick(event);
    doc?.addEventListener?.('keydown', menuKeyHandler);
    canvas.addEventListener('click', menuClickHandler);
  }

  function disableMenuInput() {
    const doc = documentRoot?.ownerDocument ?? document;
    if (menuKeyHandler) {
      doc?.removeEventListener?.('keydown', menuKeyHandler);
      menuKeyHandler = null;
    }
    if (menuClickHandler) {
      canvas?.removeEventListener?.('click', menuClickHandler);
      menuClickHandler = null;
    }
    activeMenuMode = null;
    menuState.editingSlot = false;
  }

  function showMenuPanel() {
    setFullscreenAvailability(isFullscreenSupported);
    setGameUiVisible(gameShell, false);
    hideContinuePanel();
    refreshSaveSlotList();
    showMenuScreen(MENU_SCREENS.MAIN);
    toggleVisibility(loadingPanel, false);
    enableMenuInput('menu');
  }

  function showPausePanel() {
    setGameUiVisible(gameShell, false);
    pauseState.selectionIndex = 0;
    pauseState.scrollIndex = 0;
    enableMenuInput('pause');
  }

  function hidePausePanel() {
    disableMenuInput();
  }

  function showLoadingPanel(message = 'Načítání...') {
    setGameUiVisible(gameShell, false);
    disableMenuInput();
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
    setGameUiVisible(gameShell, false);
    disableMenuInput();
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

  function resolveCutsceneImageSource(stepIndex, step, cutsceneConfig) {
    if (!step) return null;
    const imageFolder = cutsceneConfig?.imageFolder ?? '';
    const normalizedFolder = imageFolder.endsWith('/') ? imageFolder.slice(0, -1) : imageFolder;
    if (step?.image) {
      if (normalizedFolder && !step.image.includes('://') && !step.image.startsWith('/')) {
        return `${normalizedFolder}/${step.image}`;
      }
      return step.image;
    }
    if (!normalizedFolder) return null;
    const extension = cutsceneConfig?.imageExtension ?? 'png';
    return `${normalizedFolder}/step-${stepIndex + 1}.${extension}`;
  }

  const CUTSCENE_RENDER_MODE_MAP = 'map';
  const CUTSCENE_LABELS = {
    back: 'Zpět',
    skip: 'Přeskočit',
  };

  function resolveCutsceneContinueLabel(step, isLast) {
    return step?.actionLabel || (isLast ? 'Vyrazit' : 'Další');
  }

  function wrapTextLines(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const word = words[i];
      const testLine = `${line} ${word}`;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    return lines;
  }

  function drawCutsceneBackgroundImage(ctx, canvas, image, { alpha = 1, scale = 1, filter = 'none' } = {}) {
    if (!image) return;
    const maxWidth = canvas.width;
    const maxHeight = canvas.height;
    const coverScale = Math.max(maxWidth / image.width, maxHeight / image.height);
    const drawWidth = image.width * coverScale * scale;
    const drawHeight = image.height * coverScale * scale;
    const drawX = (maxWidth - drawWidth) / 2;
    const drawY = (maxHeight - drawHeight) / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = filter;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawCutsceneMap(ctx, canvas, { stepIndex = 0, steps = [], image = null } = {}) {
    const step = steps[stepIndex] ?? steps[0];
    const total = steps.length || 1;
    const panelPadding = Math.max(16, Math.round(TILE * 0.4));
    const panelHeight = Math.round(canvas.height * 0.32);
    const panelY = canvas.height - panelHeight - panelPadding;
    const panelX = panelPadding;
    const panelWidth = canvas.width - panelPadding * 2;
    const panelHeightSafe = Math.max(panelHeight, panelPadding * 3);
    const headingFontSize = Math.max(16, Math.round(TILE * 0.32));
    const bodyFontSize = Math.max(14, Math.round(TILE * 0.26));
    const buttonFontSize = Math.max(12, Math.round(TILE * 0.22));
    const lineHeight = Math.round(bodyFontSize * 1.3);
    const buttonHeight = Math.max(28, Math.round(TILE * 0.5));
    const buttonPaddingX = Math.max(12, Math.round(TILE * 0.3));
    const buttonGap = Math.max(10, Math.round(TILE * 0.2));
    const panelColors = {
      background: '#241610',
      border: '#4a2f22',
      text: '#f1e2cf',
      accent: '#c49a5a',
      button: '#2f1e16',
      buttonBorder: '#7a5a3b',
      buttonText: '#f8e7cf',
      buttonDisabled: 'rgba(248, 231, 207, 0.45)',
    };

    ctx.save();
    ctx.fillStyle = COLORS.gridBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (image?.transition) {
      const { fromImage, toImage, progress } = image.transition;
      const eased = Math.min(Math.max(progress, 0), 1);
      const flashAlpha = eased < 0.3 ? (0.3 - eased) / 0.3 : 0;
      drawCutsceneBackgroundImage(ctx, canvas, fromImage, { alpha: 1 - eased * 0.35 });
      drawCutsceneBackgroundImage(ctx, canvas, toImage, {
        alpha: eased,
        scale: 1.08 - eased * 0.08,
        filter: `brightness(${0.6 + eased * 0.4}) saturate(${1.4 - eased * 0.3}) contrast(${
          1.2 - eased * 0.2
        })`,
      });
      if (flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = flashAlpha * 0.6;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    } else if (image) {
      drawCutsceneBackgroundImage(ctx, canvas, image);
    }

    ctx.fillStyle = panelColors.background;
    ctx.strokeStyle = panelColors.border;
    ctx.lineWidth = Math.max(2, Math.round(TILE * 0.06));
    ctx.beginPath();
    ctx.rect(panelX, panelY, panelWidth, panelHeightSafe);
    ctx.fill();
    ctx.stroke();

    const textX = panelX + panelPadding;
    let textY = panelY + panelPadding;
    const textWidth = panelWidth - panelPadding * 2;

    if (step?.title) {
      ctx.font = `${headingFontSize}px sans-serif`;
      ctx.fillStyle = panelColors.accent;
      ctx.fillText(step.title, textX, textY);
      textY += Math.round(headingFontSize * 1.2);
    }

    if (step?.speaker) {
      ctx.fillStyle = panelColors.text;
      ctx.font = `${Math.round(bodyFontSize * 0.95)}px sans-serif`;
      ctx.fillText(step.speaker, textX, textY);
      textY += Math.round(bodyFontSize * 1.4);
    }

    ctx.font = `${bodyFontSize}px sans-serif`;
    ctx.fillStyle = panelColors.text;
    (step?.body ?? []).forEach((paragraph) => {
      wrapTextLines(ctx, paragraph, textWidth).forEach((line) => {
        ctx.fillText(line, textX, textY);
        textY += lineHeight;
      });
      textY += Math.round(lineHeight * 0.4);
    });

    const isLast = stepIndex >= total - 1;
    const continueLabel = resolveCutsceneContinueLabel(step, isLast);
    const labels = [
      { id: 'back', label: CUTSCENE_LABELS.back, disabled: stepIndex === 0 },
      { id: 'skip', label: CUTSCENE_LABELS.skip, disabled: false },
      { id: 'continue', label: continueLabel, disabled: false },
    ];

    ctx.font = `${buttonFontSize}px sans-serif`;
    let buttonX = panelX + panelWidth - panelPadding;
    const buttonY = panelY + panelHeightSafe - panelPadding - buttonHeight;
    const buttonRects = {};

    labels
      .slice()
      .reverse()
      .forEach((button) => {
        const width = ctx.measureText(button.label).width + buttonPaddingX * 2;
        buttonX -= width;
        const rect = { x: buttonX, y: buttonY, width, height: buttonHeight, id: button.id };
        buttonRects[button.id] = rect;
        ctx.fillStyle = panelColors.button;
        ctx.strokeStyle = panelColors.buttonBorder;
        ctx.lineWidth = Math.max(1, Math.round(TILE * 0.03));
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = button.disabled ? panelColors.buttonDisabled : panelColors.buttonText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, rect.x + rect.width / 2, rect.y + rect.height / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        buttonX -= buttonGap;
      });

    ctx.restore();
    return buttonRects;
  }

  function renderCutsceneStep(index = 0, steps = [], cutsceneConfig = {}) {
    const step = steps[index] ?? steps[0];
    const total = steps.length;
    if (cutsceneStepTitle) {
      cutsceneStepTitle.textContent = step?.title ?? 'Příběh';
    }
    if (cutsceneSpeaker) {
      cutsceneSpeaker.textContent = step?.speaker ?? '';
    }
    if (cutsceneKicker) {
      cutsceneKicker.textContent = step?.kicker ?? 'Příběh';
    }
    if (cutsceneProgress) {
      cutsceneProgress.textContent = `${Math.min(index + 1, total)} / ${total}`;
    }
    if (cutsceneContinueButton && step?.actionLabel) {
      cutsceneContinueButton.textContent = step.actionLabel;
    }
    if (cutsceneAvatar) {
      const avatarId = step?.avatar || step?.speakerType || '';
      if (avatarId) {
        cutsceneAvatar.dataset.avatar = avatarId;
        cutsceneAvatar.classList.remove('hidden');
      } else {
        cutsceneAvatar.dataset.avatar = '';
        cutsceneAvatar.classList.add('hidden');
      }
    }
    if (cutsceneStepBody) {
      cutsceneStepBody.innerHTML = '';
      (step?.body ?? []).forEach((paragraph) => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        cutsceneStepBody.appendChild(p);
      });
    }
    if (cutsceneImage && cutsceneMedia) {
      const imageSrc = resolveCutsceneImageSource(index, step, cutsceneConfig);
      const previousSrc = cutsceneImage.getAttribute('src');
      if (imageSrc) {
        if (imageSrc !== previousSrc) {
          cutsceneMedia.classList.remove('cutscene-media-transition');
          void cutsceneMedia.offsetWidth;
          cutsceneMedia.classList.add('cutscene-media-transition');
        }
        cutsceneImage.src = imageSrc;
        cutsceneImage.alt = step?.title ?? 'Ilustrace';
        cutsceneMedia.classList.remove('hidden');
      } else {
        cutsceneMedia.classList.remove('cutscene-media-transition');
        cutsceneImage.removeAttribute('src');
        cutsceneImage.alt = '';
        cutsceneMedia.classList.add('hidden');
      }
    }
  }

  function showCutscenePanel() {
    hideAllPanels();
    setGameUiVisible(gameShell, false);
    toggleVisibility(cutscenePanel, true);
    setFullscreenAvailability(isFullscreenSupported);
    cutsceneContinueButton?.focus?.();
  }

  function hideCutscenePanel() {
    toggleVisibility(cutscenePanel, false);
  }

  function waitForCutsceneContinue({ steps = [], ...cutsceneConfig } = {}) {
    if (!cutscenePanel || !steps.length) return Promise.resolve({ skipped: false });
    let stepIndex = 0;
    renderCutsceneStep(stepIndex, steps, cutsceneConfig);
    showCutscenePanel();

    const updateNav = () => {
      const step = steps[stepIndex];
      const isLast = stepIndex >= steps.length - 1;
      if (cutsceneContinueButton) {
        cutsceneContinueButton.textContent = resolveCutsceneContinueLabel(step, isLast);
      }
      if (cutsceneBackButton) {
        cutsceneBackButton.disabled = stepIndex === 0;
        cutsceneBackButton.setAttribute('aria-disabled', stepIndex === 0 ? 'true' : 'false');
      }
    };

    updateNav();

    return new Promise((resolve) => {
      const cleanup = (skipped = false) => {
        window.removeEventListener('keydown', keyHandler);
        cutsceneContinueButton?.removeEventListener('click', nextHandler);
        cutsceneBackButton?.removeEventListener('click', backHandler);
        cutsceneSkipButton?.removeEventListener('click', skipHandler);
        hideCutscenePanel();
        resolve({ skipped });
      };
      const advance = (direction = 1) => {
        const nextIndex = stepIndex + direction;
        if (nextIndex < 0) return;
        if (nextIndex >= steps.length) {
          cleanup(false);
          return;
        }
        stepIndex = nextIndex;
        renderCutsceneStep(stepIndex, steps, cutsceneConfig);
        updateNav();
      };
      const keyHandler = (event) => {
        if (event.key === 'Tab') return;
        if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
          advance(-1);
        } else if (event.key === 'ArrowRight') {
          advance(1);
        } else if (event.key === 'Escape') {
          cleanup(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
          if (stepIndex >= steps.length - 1) {
            cleanup(false);
          } else {
            advance(1);
          }
        }
      };
      const nextHandler = () => {
        if (stepIndex >= steps.length - 1) {
          cleanup(false);
        } else {
          advance(1);
        }
      };
      const backHandler = () => advance(-1);
      const skipHandler = () => cleanup(true);
      window.addEventListener('keydown', keyHandler);
      cutsceneContinueButton?.addEventListener('click', nextHandler);
      cutsceneBackButton?.addEventListener('click', backHandler);
      cutsceneSkipButton?.addEventListener('click', skipHandler);
    });
  }

  function hideAllPanels() {
    disableMenuInput();
    toggleVisibility(loadingPanel, false);
    hideContinuePanel();
    hideCutscenePanel();
  }

  function togglePauseScene() {
    if (!currentInGameSession) return;
    if (activeMenuMode === 'pause') {
      resume();
    } else {
      setScene('pause');
    }
  }

  function restartLevelFromPause() {
    const levelId = currentInGameSession?.levelId?.() ?? game.currentLevelId ?? DEFAULT_LEVEL_ID;
    setScene('loading', { levelId, slotId: resolveSlotId() });
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
    let handleSafeInteract = () => {};
    let handleQuizStart = () => {};
    let interactQueued = false;
    let shootQueued = false;
    let cutscenePlayed = false;
    let cutsceneConfig = null;
    let cutsceneMapActive = false;
    let cutsceneStepIndex = 0;
    let cutsceneButtonRects = {};
    let cutsceneImages = new Map();
    let cutsceneImageTransition = null;
    let cutsceneCanvasHandler = null;
    let cutsceneKeyHandler = null;

    function getLevelDimensions() {
      return resolveLevelDimensions(level);
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

    function createSnapshot() {
      return {
        levelState: level?.createSnapshot?.(),
        playerState: serializePlayer(player),
        playerVitals: { ...playerVitals },
        projectiles: projectilesForSave(),
        sessionState: serializeSessionState(),
        persistentState: serializePersistentState(),
        pickups: serializePickups(pickups),
        npcs: serializeNpcs(npcs),
        safes: serializeSafes(safes),
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

    function isCutsceneMapMode() {
      return cutsceneConfig?.renderMode === CUTSCENE_RENDER_MODE_MAP;
    }

    function cacheCutsceneImage(stepIndex, step, config) {
      const src = resolveCutsceneImageSource(stepIndex, step, config);
      if (!src || cutsceneImages.has(src)) return;
      const image = new Image();
      image.src = src;
      cutsceneImages.set(src, image);
    }

    function preloadCutsceneImages(config) {
      cutsceneImages.clear();
      (config?.steps ?? []).forEach((step, index) => {
        cacheCutsceneImage(index, step, config);
      });
    }

    function resolveCutsceneImage(stepIndex, step, config) {
      const src = resolveCutsceneImageSource(stepIndex, step, config);
      if (!src) return null;
      const cached = cutsceneImages.get(src);
      if (cached) return cached;
      const image = new Image();
      image.src = src;
      cutsceneImages.set(src, image);
      return image;
    }

    function handleCutsceneAction(action, totalSteps) {
      const previousIndex = cutsceneStepIndex;
      let nextIndex = cutsceneStepIndex;
      switch (action) {
        case 'back':
          if (cutsceneStepIndex > 0) {
            nextIndex = cutsceneStepIndex - 1;
          }
          break;
        case 'skip':
          cutsceneStepIndex = totalSteps - 1;
          finishCutsceneMap(true);
          return;
        case 'continue': {
          const isLast = cutsceneStepIndex >= totalSteps - 1;
          if (isLast) {
            finishCutsceneMap(false);
            return;
          }
          nextIndex = cutsceneStepIndex + 1;
          break;
        }
        default:
          break;
      }
      if (nextIndex !== previousIndex) {
        const steps = cutsceneConfig?.steps ?? [];
        const currentStep = steps[previousIndex] ?? null;
        const nextStep = steps[nextIndex] ?? null;
        const fromImage = currentStep ? resolveCutsceneImage(previousIndex, currentStep, cutsceneConfig) : null;
        const toImage = nextStep ? resolveCutsceneImage(nextIndex, nextStep, cutsceneConfig) : null;
        cutsceneImageTransition = {
          fromImage,
          toImage,
          startTime: performance.now(),
          duration: 700,
        };
        cutsceneStepIndex = nextIndex;
      }
    }

    let resolveCutsceneMap = null;

    function finishCutsceneMap(skipped) {
      cutsceneMapActive = false;
      const doc = documentRoot?.ownerDocument ?? document;
      canvas?.removeEventListener?.('click', cutsceneCanvasHandler);
      doc?.removeEventListener?.('keydown', cutsceneKeyHandler);
      cutsceneCanvasHandler = null;
      cutsceneKeyHandler = null;
      const resolveFn = resolveCutsceneMap;
      resolveCutsceneMap = null;
      if (resolveFn) {
        resolveFn({ skipped: Boolean(skipped) });
      }
    }

    function waitForCutsceneMapContinue({ steps = [], ...config } = {}) {
      if (!canvas || !steps.length) return Promise.resolve({ skipped: false });
      cutsceneStepIndex = 0;
      cutsceneMapActive = true;

      const totalSteps = steps.length;
      const doc = documentRoot?.ownerDocument ?? document;

      cutsceneCanvasHandler = (event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        const hit = Object.entries(cutsceneButtonRects).find(([, button]) => {
          if (!button) return false;
          const withinX = x >= button.x && x <= button.x + button.width;
          const withinY = y >= button.y && y <= button.y + button.height;
          return withinX && withinY;
        });
        if (!hit) return;
        const [action] = hit;
        handleCutsceneAction(action, totalSteps);
      };

      cutsceneKeyHandler = (event) => {
        switch (event.key) {
          case 'ArrowLeft':
            handleCutsceneAction('back', totalSteps);
            break;
          case 'Escape':
            handleCutsceneAction('skip', totalSteps);
            break;
          case 'Enter':
          case ' ':
            handleCutsceneAction('continue', totalSteps);
            break;
          default:
            break;
        }
      };

      canvas.addEventListener('click', cutsceneCanvasHandler);
      doc?.addEventListener?.('keydown', cutsceneKeyHandler);

      return new Promise((resolve) => {
        resolveCutsceneMap = resolve;
      });
    }

    async function runCutsceneSequence() {
      if (cutscenePlayed || !cutsceneConfig?.steps?.length) return false;
      cutscenePlayed = true;
      inputSystem?.stop?.();
      hudSystem?.hideInteraction?.();
      if (isCutsceneMapMode()) {
        setGameUiVisible(gameShell, false);
        await waitForCutsceneMapContinue(cutsceneConfig);
      } else {
        await waitForCutsceneContinue(cutsceneConfig);
      }
      setGameUiVisible(gameShell, true);
      if (cutsceneConfig?.nextLevelId) {
        state.levelAdvanceQueued = true;
        setTimeout(() => {
          game.advanceToNextMap?.(cutsceneConfig.nextLevelId);
        }, 0);
      }
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
      cutsceneConfig = level?.meta?.cutscene ?? null;
      if (isCutsceneMapMode()) {
        preloadCutsceneImages(cutsceneConfig);
      }
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
      const handlePickupCollected = (pickup) => {
        if (pickup.id === 'ammo') {
          const amount = Number.isFinite(pickup.quantity) ? pickup.quantity : 1;
          addAmmo(amount);
        }
      };

      safePanelController.init({
        inventory,
        renderInventory,
        showNote: (noteId, params) => hudSystem.showNote(noteId, params),
        saveProgress: (options) => game.saveProgress?.(options),
      });
      handleSafeInteract = safePanelController.handleSafeInteract;

      quizPanelController.init({
        inventory,
        renderInventory,
        level,
        game,
        hud: hudSystem,
        persistentState,
        sessionState,
        state,
        clearDialogueState,
        hideInteraction: () => hudSystem.hideInteraction(),
      });
      handleQuizStart = quizPanelController.handleQuizStart;

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
          case INPUT_ACTIONS.INTERACT:
            interactQueued = true;
            break;
          case INPUT_ACTIONS.SHOOT:
            shootQueued = true;
            break;
          case INPUT_ACTIONS.USE_SLOT:
            handleInventoryUse(detail.slotIndex);
            break;
          case INPUT_ACTIONS.TOGGLE_PAUSE:
            togglePauseScene();
            break;
          case INPUT_ACTIONS.TOGGLE_INVENTORY:
            toggleInventory();
            break;
          case INPUT_ACTIONS.TOGGLE_QUEST_LOG:
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
      const questBindingLabel = formatBinding(inputSystem.getBindings(), INPUT_ACTIONS.TOGGLE_QUEST_LOG);
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

      const findBlockingEntity = (entities = [], size, nx, ny) =>
        entities.find((entity) => overlapsEntity(nx, ny, size, entity.x, entity.y, entity));

      const canMoveWithEntities = (size, nx, ny) =>
        level.canMove(size, nx, ny) &&
        !findBlockingEntity(pushables, size, nx, ny) &&
        !findBlockingEntity(safes, size, nx, ny);

      updateFrame = (dt) => {
        if (cutsceneMapActive) {
          return;
        }
        updatePlayer(player, dt, { canMove: level.canMove.bind(level), pushables, blockers: safes });
        level.updatePressureSwitches(getSwitchOccupants());
        level.updateLightSwitchTimers(dt);
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
        if (cutsceneMapActive) {
          const step = cutsceneConfig?.steps?.[cutsceneStepIndex] ?? null;
          const image = step ? resolveCutsceneImage(cutsceneStepIndex, step, cutsceneConfig) : null;
          let transition = null;
          if (cutsceneImageTransition) {
            const elapsed = performance.now() - cutsceneImageTransition.startTime;
            const progress = Math.min(elapsed / cutsceneImageTransition.duration, 1);
            transition = { ...cutsceneImageTransition, progress };
            if (progress >= 1) {
              cutsceneImageTransition = null;
              transition = null;
            }
          }
          cutsceneButtonRects = drawCutsceneMap(ctx, canvas, {
            stepIndex: cutsceneStepIndex,
            steps: cutsceneConfig?.steps ?? [],
            image: transition ? { transition } : image,
          });
          return;
        }
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
        drawCameraBounds(ctx, getLevelDimensions(), camera);
      };

      renderMapFrame = () => {
        renderMapOnly(ctx, canvas, level, camera, spriteSheet);
      };

      game.setSnapshotProvider(() => createSnapshot());
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
    let renderMapFrame = noop;

    function pauseSession() {
      resetActionQueue();
      safePanelController.hide();
      quizPanelController.hide();
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
      if (cutsceneMapActive) {
        finishCutsceneMap(false);
      }
      levelScript?.destroy?.();
      levelScript = null;
      game.setSnapshotProvider(null);
      hudSystem?.hideToast?.();
      inventoryToggleButton?.removeEventListener?.('click', handleInventoryToggleClick);
      questToggleButton?.removeEventListener?.('click', handleQuestToggleClick);
      safePanelController.cleanup();
      quizPanelController.cleanup();
    }

    return {
      bootstrap,
      pause: pauseSession,
      resume: resumeSession,
      cleanup,
      runIntro: () => runCutsceneSequence(),
      manualSave,
      getCarryOverVitals: () => ({
        ammo: playerVitals.ammo ?? 0,
        maxAmmo: playerVitals.maxAmmo ?? 0,
      }),
      updateFrame: (dt) => updateFrame(dt),
      renderFrame: () => renderFrame(),
      renderMapOnly: () => renderMapFrame(),
      levelId: () => level?.meta?.id ?? levelId ?? DEFAULT_LEVEL_ID,
    };
  }

  let currentInGameSession = null;

  registerScene('menu', {
    async onEnter() {
      setFullscreenAvailability(isFullscreenSupported);
      await ensureMenuMapLevel();
      showMenuPanel();
    },
    onRender() {
      if (menuMapLevel && menuMapSpriteSheet) {
        renderMapOnly(ctx, canvas, menuMapLevel, menuMapCamera, menuMapSpriteSheet);
      } else {
        ctx.fillStyle = COLORS.gridBackground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const items = buildMenuItems();
      drawMenuOverlay({
        title: MENU_TITLES[menuState.screen],
        subtitle: MENU_SUBTITLES[menuState.screen],
        items,
        state: menuState,
        showSlotHint: menuState.screen === MENU_SCREENS.NEW_GAME,
      });
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
      setGameUiVisible(gameShell, true);
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
      setGameUiVisible(gameShell, true);
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
      currentInGameSession?.renderMapOnly?.();
      const items = buildPauseItems();
      drawMenuOverlay({
        title: 'Pauza',
        subtitle: 'Stiskni P nebo vyber možnost.',
        items,
        state: pauseState,
      });
    },
  });

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
