const DEFAULT_SCALE_LIMITS = { min: 0.6, max: 5 };
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
  fullscreenEnabled: false,
  fullscreenSupported: false,
  fullscreenPrompt: null,
  fullscreenRequestButton: null,
  fullscreenDismissButton: null,
  fullscreenPromptDismissed: false,
};

export function setScale(value) {
  if (!shellState.documentRoot) return;
  shellState.documentRoot.documentElement.style.setProperty('--game-scale', value.toString());
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
  const activeFullscreen = isFullscreenActive();

  if (shellState.canvas) {
    if (activeFullscreen) {
      const nextWidth = Math.max(1, Math.floor(availableWidth));
      const nextHeight = Math.max(1, Math.floor(availableHeight));
      if (shellState.canvas.width !== nextWidth || shellState.canvas.height !== nextHeight) {
        shellState.canvas.width = nextWidth;
        shellState.canvas.height = nextHeight;
        shellState.documentRoot.documentElement.style.setProperty('--canvas-width', `${nextWidth}px`);
        shellState.documentRoot.documentElement.style.setProperty('--canvas-height', `${nextHeight}px`);
      }
      setScale(1);
      return;
    }

    if (
      shellState.canvas.width !== shellState.baseCanvas.width ||
      shellState.canvas.height !== shellState.baseCanvas.height
    ) {
      shellState.canvas.width = shellState.baseCanvas.width;
      shellState.canvas.height = shellState.baseCanvas.height;
      syncCanvasCssDimensions();
    }
  }

  const widthScale = availableWidth / shellState.baseCanvas.width;
  const heightScale = availableHeight / shellState.baseCanvas.height;
  const nextScale = Math.min(
    shellState.scaleLimits.max,
    Math.max(shellState.scaleLimits.min, Math.min(widthScale, heightScale)),
  );
  setScale(Number.isFinite(nextScale) ? Number(nextScale.toFixed(3)) : shellState.scaleLimits.min);
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
  if (shellState.fullscreenButton) {
    shellState.fullscreenButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    shellState.fullscreenButton.textContent = active ? '⤢' : '⛶';
    shellState.fullscreenButton.setAttribute(
      'aria-label',
      active ? 'Zavřít celou obrazovku' : 'Celá obrazovka',
    );
  }
}

function setFullscreenAvailability(enabled) {
  shellState.fullscreenEnabled = Boolean(enabled);
  if (!shellState.fullscreenButton) return;
  shellState.fullscreenButton.disabled = !shellState.fullscreenEnabled;
  shellState.fullscreenButton.setAttribute('aria-disabled', shellState.fullscreenEnabled ? 'false' : 'true');
  shellState.fullscreenButton.classList.toggle('is-disabled', !shellState.fullscreenEnabled);
  const label = shellState.fullscreenEnabled
    ? 'Celá obrazovka'
    : 'Celá obrazovka není v prohlížeči dostupná';
  shellState.fullscreenButton.setAttribute('aria-label', label);
  shellState.fullscreenButton.title = label;
}

function requestFullscreen() {
  const target = shellState.gameShell ?? shellState.documentRoot?.documentElement ?? null;
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
      updateScale();
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
  shellState.fullscreenButton = root?.querySelector('[data-fullscreen-toggle]') ?? null;
  shellState.fullscreenPrompt = root?.querySelector('[data-fullscreen-prompt]') ?? null;
  shellState.fullscreenRequestButton = root?.querySelector('[data-fullscreen-request]') ?? null;
  shellState.fullscreenDismissButton = root?.querySelector('[data-fullscreen-dismiss]') ?? null;

  const domRefs = {
    documentRoot: root,
    menuPanel: root?.querySelector('.menu-panel') ?? null,
    fullscreenButton: shellState.fullscreenButton,
    gameShell: shellState.gameShell,
    alertLayer: root?.querySelector('[data-alert-layer]') ?? null,
    pausePanel: root?.querySelector('.pause-panel') ?? null,
    loadingPanel: root?.querySelector('.loading-panel') ?? null,
    continuePanel: root?.querySelector('.continue-panel') ?? null,
    continueTitle: root?.querySelector('[data-continue-title]') ?? null,
    continueSubtitle: root?.querySelector('[data-continue-subtitle]') ?? null,
    continueDetail: root?.querySelector('[data-continue-detail]') ?? null,
    prologuePanel: root?.querySelector('.prologue-panel') ?? null,
    prologueContinueButton: root?.querySelector('[data-prologue-continue]') ?? null,
    prologueBackButton: root?.querySelector('[data-prologue-back]') ?? null,
    prologueStepTitle: root?.querySelector('[data-prologue-step-title]') ?? null,
    prologueStepBody: root?.querySelector('[data-prologue-body]') ?? null,
    prologueProgress: root?.querySelector('[data-prologue-progress]') ?? null,
    prologueAvatar: root?.querySelector('[data-prologue-avatar]') ?? null,
    prologueSpeaker: root?.querySelector('[data-prologue-speaker]') ?? null,
    prologueKicker: root?.querySelector('[data-prologue-kicker]') ?? null,
    levelSelectInput: root?.querySelector('[data-level-input]') ?? null,
    slotInput: root?.querySelector('[data-slot-input]') ?? null,
    menuSubtitle: root?.querySelector('.menu-subtitle') ?? null,
    saveSlotList: root?.querySelector('[data-save-slot-list]') ?? null,
    startButton: root?.querySelector('[data-menu-start]') ?? null,
    continueButton: root?.querySelector('[data-menu-continue]') ?? null,
    selectButton: root?.querySelector('[data-menu-select]') ?? null,
    settingsButton: root?.querySelector('[data-menu-settings]') ?? null,
    pauseResumeButton: root?.querySelector('[data-pause-resume]') ?? null,
    pauseRestartButton: root?.querySelector('[data-pause-restart]') ?? null,
    pauseSaveButton: root?.querySelector('[data-pause-save]') ?? null,
    pauseMenuButton: root?.querySelector('[data-pause-menu]') ?? null,
  };

  shellState.fullscreenSupported = Boolean(
    root?.fullscreenEnabled ?? root?.webkitFullscreenEnabled ?? getFullscreenElement(root),
  );

  if (shellState.fullscreenButton) {
    shellState.fullscreenButton.addEventListener('click', toggleFullscreen);
  }
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
