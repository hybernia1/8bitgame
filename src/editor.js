import {
  buildTileLayersFromTokens,
  resolveTileToken,
} from './data/levels/map-utils.js';
import {
  DEFAULT_LEVEL_ID,
  loadLevelConfig,
  registry,
  loaderRegistry,
} from './world/level-data.js';
import {
  TILE_IDS,
  getDecorVariantIndex,
  getDestroyVariantIndex,
  getFloorVariantIndex,
  getWallVariantIndex,
} from './world/tile-registry.js';

const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 15;
const DEFAULT_TOKEN = 'F1';
const DEFAULT_UNLOCK_TILE = TILE_IDS.DOOR_OPEN;

const NAMED_TILE_TOKENS = new Map([
  [TILE_IDS.DOOR_CLOSED, 'DR'],
  [TILE_IDS.DOOR_OPEN, 'OD'],
  [TILE_IDS.DECOR_CONSOLE, 'CONSOLE'],
  [TILE_IDS.FLOOR_BROKEN, 'FLOOR_BROKEN'],
]);

const TOKEN_GROUPS = [
  ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
  ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
  ['DR', 'OD', 'CONSOLE', 'FLOOR_BROKEN'],
  ['F1E1', 'F1E2', 'F2E3', 'W1E1', 'W1E2'],
  ['F1D1', 'F1D2', 'W1D1', 'W1D1F2'],
  ['E1', 'E2', 'D1', 'D2'],
];

const elements = {
  levelSelect: document.querySelector('#level-select'),
  loadButton: document.querySelector('[data-load-level]'),
  newButton: document.querySelector('[data-new-level]'),
  widthInput: document.querySelector('#level-width'),
  heightInput: document.querySelector('#level-height'),
  resizeButton: document.querySelector('[data-resize]'),
  tokenInput: document.querySelector('#token-input'),
  applyTokenButton: document.querySelector('[data-apply-token]'),
  tokenPreview: document.querySelector('[data-token-preview]'),
  palette: document.querySelector('[data-palette]'),
  grid: document.querySelector('[data-grid]'),
  unlockList: document.querySelector('[data-unlock-list]'),
  addUnlock: document.querySelector('[data-add-unlock]'),
  exportArea: document.querySelector('[data-export-area]'),
  copyExport: document.querySelector('[data-copy-export]'),
  downloadExport: document.querySelector('[data-download-export]'),
  exportStatus: document.querySelector('[data-export-status]'),
};

const state = {
  levelId: DEFAULT_LEVEL_ID,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  tokens: Array.from({ length: DEFAULT_WIDTH * DEFAULT_HEIGHT }, () => DEFAULT_TOKEN),
  selectedToken: DEFAULT_TOKEN,
  unlockMask: [],
};

let isPainting = false;

function getAvailableLevelIds() {
  return [...new Set([DEFAULT_LEVEL_ID, ...registry.keys(), ...loaderRegistry.keys()])].sort();
}

function normalizeToken(token) {
  const trimmed = String(token ?? '').trim();
  return trimmed.length ? trimmed : DEFAULT_TOKEN;
}

function tokenFromLayers(collision, decor, destroyedFloor) {
  const named = NAMED_TILE_TOKENS.get(collision);
  if (named && collision === decor) return named;

  const wallIndex = getWallVariantIndex(collision);
  const floorIndex = getFloorVariantIndex(collision);
  const baseToken = wallIndex ? `W${wallIndex}` : floorIndex ? `F${floorIndex}` : null;

  const destroyIndex = getDestroyVariantIndex(decor);
  if (destroyIndex) {
    if (baseToken) {
      const destroyedFloorIndex = getFloorVariantIndex(destroyedFloor);
      if (destroyedFloorIndex && (!floorIndex || destroyedFloorIndex !== floorIndex)) {
        return `${baseToken}D${destroyIndex}F${destroyedFloorIndex}`;
      }
      return `${baseToken}D${destroyIndex}`;
    }
    return `D${destroyIndex}`;
  }

  const decorIndex = getDecorVariantIndex(decor);
  if (decorIndex && decor !== collision) {
    if (baseToken) {
      return `${baseToken}E${decorIndex}`;
    }
    return `E${decorIndex}`;
  }

  if (baseToken) return baseToken;
  if (named) return named;

  return String(collision ?? DEFAULT_TOKEN);
}

function buildTokensFromLevel(levelConfig) {
  const { width, height } = levelConfig.dimensions ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const collision = levelConfig.tileLayers?.collision ?? [];
  const decor = levelConfig.tileLayers?.decor ?? [];
  const destroyed = levelConfig.tileLayers?.destroyedFloors ?? [];
  const tokens = [];

  for (let index = 0; index < width * height; index += 1) {
    tokens.push(tokenFromLayers(collision[index], decor[index], destroyed[index]));
  }

  return { width, height, tokens };
}

function updateTokenPreview() {
  if (!elements.tokenPreview) return;
  elements.tokenPreview.innerHTML = `Aktivní: <strong>${state.selectedToken}</strong>`;
}

function updatePalette() {
  if (!elements.palette) return;
  elements.palette.innerHTML = '';
  TOKEN_GROUPS.flat().forEach((token) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = token;
    if (token === state.selectedToken) {
      button.classList.add('is-active');
    }
    button.addEventListener('click', () => {
      setSelectedToken(token);
    });
    elements.palette.appendChild(button);
  });
}

function getTokenClass(token) {
  const value = String(token ?? '').toUpperCase();
  if (value.startsWith('F')) return 'token-floor';
  if (value.startsWith('W')) return 'token-wall';
  if (value.startsWith('DR') || value.startsWith('OD')) return 'token-door';
  if (value.includes('E') || value.includes('D')) return 'token-overlay';
  return 'token-custom';
}

function renderGrid() {
  if (!elements.grid) return;
  elements.grid.style.gridTemplateColumns = `repeat(${state.width}, 28px)`;
  elements.grid.innerHTML = '';

  state.tokens.forEach((token, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.dataset.index = String(index);
    cell.textContent = token;
    cell.classList.add(getTokenClass(token));

    cell.addEventListener('mousedown', () => {
      paintCell(index);
      isPainting = true;
    });

    cell.addEventListener('mouseover', () => {
      if (isPainting) paintCell(index);
    });

    elements.grid.appendChild(cell);
  });
}

function paintCell(index) {
  state.tokens[index] = state.selectedToken;
  const cell = elements.grid?.querySelector(`[data-index="${index}"]`);
  if (cell) {
    cell.textContent = state.selectedToken;
    cell.className = '';
    cell.classList.add(getTokenClass(state.selectedToken));
  }
  updateExport();
}

function setSelectedToken(token) {
  state.selectedToken = normalizeToken(token);
  updateTokenPreview();
  updatePalette();
}

function updateUnlockList() {
  if (!elements.unlockList) return;
  elements.unlockList.innerHTML = '';

  state.unlockMask.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'unlock-item';

    const txInput = document.createElement('input');
    txInput.type = 'number';
    txInput.value = entry.tx;
    txInput.addEventListener('input', () => {
      entry.tx = Number.parseInt(txInput.value, 10) || 0;
      updateExport();
    });

    const tyInput = document.createElement('input');
    tyInput.type = 'number';
    tyInput.value = entry.ty;
    tyInput.addEventListener('input', () => {
      entry.ty = Number.parseInt(tyInput.value, 10) || 0;
      updateExport();
    });

    const tileInput = document.createElement('input');
    tileInput.type = 'number';
    tileInput.value = entry.tile;
    tileInput.addEventListener('input', () => {
      entry.tile = Number.parseInt(tileInput.value, 10) || DEFAULT_UNLOCK_TILE;
      updateExport();
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = '✕';
    removeButton.addEventListener('click', () => {
      state.unlockMask.splice(index, 1);
      updateUnlockList();
      updateExport();
    });

    row.append(txInput, tyInput, tileInput, removeButton);
    elements.unlockList.appendChild(row);
  });
}

function formatTokenArray(tokens, width) {
  const rows = [];
  for (let row = 0; row < tokens.length; row += width) {
    const slice = tokens.slice(row, row + width).map((token) => `'${token}'`);
    rows.push(`  ${slice.join(', ')}`);
  }
  return `const baseLayoutTokens = [\n${rows.join(',\n')}\n];`;
}

function formatUnlockMask() {
  if (!state.unlockMask.length) return 'const baseUnlockMask = [];';
  const entries = state.unlockMask
    .map((entry) => `  { tx: ${entry.tx}, ty: ${entry.ty}, tile: ${entry.tile} }`)
    .join(',\n');
  return `const baseUnlockMask = [\n${entries}\n];`;
}

function updateExport() {
  if (!elements.exportArea) return;
  const defaultBase = resolveTileToken(DEFAULT_TOKEN);
  const layoutSnippet = formatTokenArray(state.tokens, state.width);
  const unlockSnippet = formatUnlockMask();

  const output = [
    'import { buildTileLayersFromTokens } from "../data/levels/map-utils.js";',
    `\nconst BASE_WIDTH = ${state.width};`,
    `const BASE_HEIGHT = ${state.height};`,
    '',
    layoutSnippet,
    'const baseLayout = buildTileLayersFromTokens(baseLayoutTokens, { defaultBase: ' + defaultBase + ' });',
    '',
    unlockSnippet,
    '',
    'const tileLayers = {',
    '  collision: [...baseLayout.collision],',
    '  decor: [...baseLayout.decor],',
    '  destroyedFloors: [...baseLayout.destroyedFloors],',
    '  unlockMask: baseUnlockMask,',
    '};',
  ].join('\n');

  elements.exportArea.value = output;
}

function updateDimensions(width, height) {
  state.width = width;
  state.height = height;
  elements.widthInput.value = width;
  elements.heightInput.value = height;
}

function resizeGrid(newWidth, newHeight) {
  const nextTokens = Array.from({ length: newWidth * newHeight }, () => DEFAULT_TOKEN);

  for (let y = 0; y < Math.min(state.height, newHeight); y += 1) {
    for (let x = 0; x < Math.min(state.width, newWidth); x += 1) {
      const oldIndex = y * state.width + x;
      const newIndex = y * newWidth + x;
      nextTokens[newIndex] = state.tokens[oldIndex] ?? DEFAULT_TOKEN;
    }
  }

  state.tokens = nextTokens;
  updateDimensions(newWidth, newHeight);
  renderGrid();
  updateExport();
}

async function loadLevel(id) {
  const config = await loadLevelConfig(id);
  const { width, height, tokens } = buildTokensFromLevel(config);
  state.levelId = id;
  state.tokens = tokens;
  state.unlockMask = (config.tileLayers?.unlockMask ?? []).map((entry) => ({
    tx: entry.tx ?? 0,
    ty: entry.ty ?? 0,
    tile: entry.tile ?? DEFAULT_UNLOCK_TILE,
  }));

  updateDimensions(width, height);
  renderGrid();
  updateUnlockList();
  updateExport();
}

function createBlankLevel() {
  state.levelId = 'new-level';
  state.tokens = Array.from({ length: state.width * state.height }, () => DEFAULT_TOKEN);
  state.unlockMask = [];
  renderGrid();
  updateUnlockList();
  updateExport();
}

async function handleCopyExport() {
  if (!elements.exportArea) return;
  const text = elements.exportArea.value;
  const showStatus = (message) => {
    if (!elements.exportStatus) return;
    elements.exportStatus.textContent = message;
    setTimeout(() => {
      elements.exportStatus.textContent = '';
    }, 2000);
  };

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showStatus('Výstup zkopírován do schránky.');
      return;
    }
  } catch {
    // fallback below
  }

  elements.exportArea.select();
  const success = document.execCommand('copy');
  showStatus(success ? 'Výstup zkopírován do schránky.' : 'Nepodařilo se kopírovat.');
}

function handleDownloadExport() {
  const payload = {
    id: state.levelId,
    width: state.width,
    height: state.height,
    tokens: state.tokens,
    unlockMask: state.unlockMask,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.levelId}-layout.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.addEventListener('mouseup', () => {
    isPainting = false;
  });

  elements.applyTokenButton?.addEventListener('click', () => {
    setSelectedToken(elements.tokenInput?.value);
  });

  elements.loadButton?.addEventListener('click', () => {
    const id = elements.levelSelect?.value ?? DEFAULT_LEVEL_ID;
    loadLevel(id);
  });

  elements.newButton?.addEventListener('click', () => {
    createBlankLevel();
  });

  elements.resizeButton?.addEventListener('click', () => {
    const width = Number.parseInt(elements.widthInput?.value, 10) || DEFAULT_WIDTH;
    const height = Number.parseInt(elements.heightInput?.value, 10) || DEFAULT_HEIGHT;
    resizeGrid(width, height);
  });

  elements.addUnlock?.addEventListener('click', () => {
    state.unlockMask.push({ tx: 0, ty: 0, tile: DEFAULT_UNLOCK_TILE });
    updateUnlockList();
    updateExport();
  });

  elements.copyExport?.addEventListener('click', handleCopyExport);
  elements.downloadExport?.addEventListener('click', handleDownloadExport);
}

function populateLevelSelect() {
  if (!elements.levelSelect) return;
  elements.levelSelect.innerHTML = '';
  getAvailableLevelIds().forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = id;
    if (id === DEFAULT_LEVEL_ID) option.selected = true;
    elements.levelSelect.appendChild(option);
  });
}

function init() {
  populateLevelSelect();
  updateTokenPreview();
  updatePalette();
  renderGrid();
  updateUnlockList();
  updateExport();
  bindEvents();
  loadLevel(DEFAULT_LEVEL_ID);
}

init();
