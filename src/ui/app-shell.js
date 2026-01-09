const DEFAULT_SCALE_LIMITS = { min: 0.6, max: 5 };
const DEFAULT_UI_SCALE_LIMITS = { min: 0.85, max: 1.8 };
const VIEWPORT_BUFFER = 0;

const defaultDocument = typeof document !== 'undefined' ? document : null;

let shellState = {
  documentRoot: defaultDocument,
  canvas: null,
  baseCanvas: { width: 0, height: 0 },
  scaleLimits: DEFAULT_SCALE_LIMITS,
  viewportBuffer: VIEWPORT_BUFFER,
  gameShell: null,
  fullscreenButton: null,
  fullscreenButtons: [],
  fullscreenEnabled: false,
  fullscreenSupported: false,
  fullscreenPrompt: null,
  fullscreenRequestButton: null,
  fullscreenDismissButton: null,
  fullscreenPromptDismissed: false,
  fullscreenTarget: null,
};

export function setScale(value) {
  if (!shellState.documentRoot) return;
  shellState.documentRoot.documentElement.style.setProperty('--game-scale', value.toString());
}

export function setUiScale(value) {
  if (!shellState.documentRoot) return;
  shellState.documentRoot.documentElement.style.setProperty('--ui-scale', value.toString());
}

function syncCanvasCssDimensions() {
  if (!shellState.documentRoot) return;
  shellState.documentRoot.documentElement.style.setProperty('--canvas-width', `${shellState.baseCanvas.width}px`);
  shellState.documentRoot.documentElement.style.setProperty('--canvas-height', `${shellState.baseCanvas.height}px`);
}

function updateScale() {
  if (!shellState.documentRoot) return;
  const viewportWidth =
    shellState.documentRoot.documentElement.clientWidth || window.innerWidth || shellState.baseCanvas.width;
  const viewportHeight =
    shellState.documentRoot.documentElement.clientHeight || window.innerHeight || shellState.baseCanvas.height;
  const availableWidth = Math.max(0, viewportWidth - shellState.viewportBuffer);
  const availableHeight = Math.max(0, viewportHeight - shellState.viewportBuffer);
  const widthScale = availableWidth / shellState.baseCanvas.width;
  const heightScale = availableHeight / shellState.baseCanvas.height;
  const nextScale = Math.min(
    shellState.scaleLimits.max,
    Math.max(shellState.scaleLimits.min, Math.min(widthScale, heightScale)),
  );
  const resolvedScale = Number.isFinite(nextScale) ? Number(nextScale.toFixed(3)) : shellState.scaleLimits.min;
  setScale(resolvedScale);
  const uiScale = Math.min(DEFAULT_UI_SCALE_LIMITS.max, Math.max(DEFAULT_UI_SCALE_LIMITS.min, resolvedScale));
  setUiScale(Number(uiScale.toFixed(3)));
}

function getFullscreenElement(root = shellState.documentRoot) {
  if (!root) return null;
  return root.fullscreenElement || root.webkitFullscreenElement || null;
}

function isFullscreenActive() {
  return Boolean(getFullscreenElement());
}

function setFullscreenUi(active) {
  shellState.gameShell?.classList.toggle('is-fullscreen', active);
  if (active) {
    hideFullscreenPrompt();
  }
  shellState.fullscreenButtons.forEach((button) => {
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.textContent = active ? '⤢' : '⛶';
    button.setAttribute('aria-label', active ? 'Zavřít celou obrazovku' : 'Celá obrazovka');
  });
  updateScale();
}

function setFullscreenAvailability(enabled) {
  shellState.fullscreenEnabled = Boolean(enabled);
  if (!shellState.fullscreenButtons.length) return;
  shellState.fullscreenButtons.forEach((button) => {
    button.disabled = !shellState.fullscreenEnabled;
    button.setAttribute('aria-disabled', shellState.fullscreenEnabled ? 'false' : 'true');
    button.classList.toggle('is-disabled', !shellState.fullscreenEnabled);
  });
  const label = shellState.fullscreenEnabled
    ? 'Celá obrazovka'
    : 'Celá obrazovka není v prohlížeči dostupná';
  shellState.fullscreenButtons.forEach((button) => {
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}

function requestFullscreen() {
  const target =
    shellState.fullscreenTarget ?? shellState.gameShell ?? shellState.canvas ?? shellState.documentRoot?.documentElement;
  if (!target) return;
  const enter =
    target.requestFullscreen ??
    target.webkitRequestFullscreen ??
    target.msRequestFullscreen ??
    target.mozRequestFullScreen;
  enter?.call(target);
}

function exitFullscreen() {
  if (!shellState.documentRoot) return;
  const exit =
    shellState.documentRoot.exitFullscreen ??
    shellState.documentRoot.webkitExitFullscreen ??
    shellState.documentRoot.msExitFullscreen ??
    shellState.documentRoot.mozCancelFullScreen;
  exit?.call(shellState.documentRoot);
}

export function toggleFullscreen() {
  if (!shellState.fullscreenEnabled) return;
  const active = Boolean(getFullscreenElement());
  if (active) {
    exitFullscreen();
  } else {
    requestFullscreen();
  }
}

function hideFullscreenPrompt() {
  shellState.fullscreenPromptDismissed = true;
  shellState.fullscreenPrompt?.classList.add('hidden');
}

function showFullscreenPrompt() {
  if (!shellState.fullscreenPrompt) return;
  if (!shellState.fullscreenEnabled || shellState.fullscreenPromptDismissed || isFullscreenActive()) {
    shellState.fullscreenPrompt.classList.add('hidden');
    return;
  }
  shellState.fullscreenPrompt.classList.remove('hidden');
}

function bindFullscreenListeners() {
  if (!shellState.documentRoot) return;
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((event) =>
    shellState.documentRoot.addEventListener(event, () => {
      const active = Boolean(getFullscreenElement());
      setFullscreenUi(active);
      if (!active) {
        shellState.fullscreenPromptDismissed = false;
      }
      showFullscreenPrompt();
    }),
  );
}

export function initShell({
  canvas,
  baseCanvas,
  scaleLimits = DEFAULT_SCALE_LIMITS,
  viewportBuffer = VIEWPORT_BUFFER,
} = {}) {
  shellState = {
    ...shellState,
    canvas: canvas ?? shellState.canvas,
    baseCanvas: baseCanvas ?? shellState.baseCanvas,
    scaleLimits,
    viewportBuffer,
  };

  if (shellState.canvas) {
    shellState.canvas.width = shellState.baseCanvas.width;
    shellState.canvas.height = shellState.baseCanvas.height;
  }

  const root = shellState.documentRoot;
  shellState.gameShell = root?.querySelector('.game-shell') ?? null;
  shellState.fullscreenTarget = root?.querySelector('.game-frame') ?? shellState.gameShell ?? shellState.canvas ?? null;
  const fullscreenButtons = Array.from(root?.querySelectorAll('[data-fullscreen-toggle]') ?? []);
  shellState.fullscreenButton = fullscreenButtons[0] ?? null;
  shellState.fullscreenButtons = fullscreenButtons;
  shellState.fullscreenPrompt = root?.querySelector('[data-fullscreen-prompt]') ?? null;
  shellState.fullscreenRequestButton = root?.querySelector('[data-fullscreen-request]') ?? null;
  shellState.fullscreenDismissButton = root?.querySelector('[data-fullscreen-dismiss]') ?? null;

  const domRefs = {
    documentRoot: root,
    menuPanel: root?.querySelector('.menu-panel') ?? null,
    menuScreens: root?.querySelectorAll('[data-menu-screen]') ?? [],
    menuLevelList: root?.querySelector('[data-level-list]') ?? null,
    menuBackButtons: root?.querySelectorAll('[data-menu-back]') ?? [],
    menuNewGameButton: root?.querySelector('[data-menu-newgame]') ?? null,
    menuContinueButton: root?.querySelector('[data-menu-continue]') ?? null,
    menuContinueLatestButton: root?.querySelector('[data-menu-continue-latest]') ?? null,
    menuLevelsButton: root?.querySelector('[data-menu-levels]') ?? null,
    fullscreenButton: shellState.fullscreenButton,
    gameShell: shellState.gameShell,
    hudLayer: root?.querySelector('.hud-layer') ?? null,
    interactionBanner: root?.querySelector('.interaction-banner') ?? null,
    interactionBubble: root?.querySelector('.interaction-bubble') ?? null,
    inventoryPanel: root?.querySelector('.inventory-modal') ?? null,
    alertLayer: root?.querySelector('[data-alert-layer]') ?? null,
    pausePanel: root?.querySelector('.pause-panel') ?? null,
    loadingPanel: root?.querySelector('.loading-panel') ?? null,
    continuePanel: root?.querySelector('.continue-panel') ?? null,
    continueTitle: root?.querySelector('[data-continue-title]') ?? null,
    continueSubtitle: root?.querySelector('[data-continue-subtitle]') ?? null,
    continueDetail: root?.querySelector('[data-continue-detail]') ?? null,
    cutscenePanel: root?.querySelector('.cutscene-panel') ?? null,
    cutsceneContinueButton: root?.querySelector('[data-cutscene-continue]') ?? null,
    cutsceneBackButton: root?.querySelector('[data-cutscene-back]') ?? null,
    cutsceneSkipButton: root?.querySelector('[data-cutscene-skip]') ?? null,
    cutsceneMedia: root?.querySelector('[data-cutscene-media]') ?? null,
    cutsceneImage: root?.querySelector('[data-cutscene-image]') ?? null,
    cutsceneStepTitle: root?.querySelector('[data-cutscene-step-title]') ?? null,
    cutsceneStepBody: root?.querySelector('[data-cutscene-body]') ?? null,
    cutsceneProgress: root?.querySelector('[data-cutscene-progress]') ?? null,
    cutsceneAvatar: root?.querySelector('[data-cutscene-avatar]') ?? null,
    cutsceneSpeaker: root?.querySelector('[data-cutscene-speaker]') ?? null,
    cutsceneKicker: root?.querySelector('[data-cutscene-kicker]') ?? null,
    slotInput: root?.querySelector('[data-slot-input]') ?? null,
    saveSlotList: root?.querySelector('[data-save-slot-list]') ?? null,
    startButton: root?.querySelector('[data-menu-start]') ?? null,
    settingsButton: root?.querySelector('[data-menu-settings]') ?? null,
    pauseResumeButton: root?.querySelector('[data-pause-resume]') ?? null,
    pauseRestartButton: root?.querySelector('[data-pause-restart]') ?? null,
    pauseSaveButton: root?.querySelector('[data-pause-save]') ?? null,
    pauseMenuButton: root?.querySelector('[data-pause-menu]') ?? null,
  };

  shellState.fullscreenSupported = Boolean(
    root?.fullscreenEnabled ??
      root?.webkitFullscreenEnabled ??
      getFullscreenElement(root) ??
      shellState.fullscreenTarget?.requestFullscreen ??
      shellState.fullscreenTarget?.webkitRequestFullscreen,
  );

  shellState.fullscreenButtons.forEach((button) => {
    button.addEventListener('click', toggleFullscreen);
  });
  if (shellState.fullscreenRequestButton) {
    shellState.fullscreenRequestButton.addEventListener('click', () => {
      requestFullscreen();
    });
  }
  if (shellState.fullscreenDismissButton) {
    shellState.fullscreenDismissButton.addEventListener('click', () => {
      hideFullscreenPrompt();
    });
  }

  setFullscreenUi(Boolean(getFullscreenElement()));
  setFullscreenAvailability(shellState.fullscreenSupported);
  showFullscreenPrompt();

  if (root) {
    syncCanvasCssDimensions();
    updateScale();
    bindFullscreenListeners();
    window.addEventListener('resize', updateScale, { passive: true });
  }

  return {
    ...domRefs,
    fullscreenSupported: shellState.fullscreenSupported,
    requestFullscreen: () => {
      if (!shellState.fullscreenSupported || isFullscreenActive()) return;
      requestFullscreen();
    },
    isFullscreenActive,
    setFullscreenAvailability,
    setFullscreenUi,
    showFullscreenPrompt,
  };
}
