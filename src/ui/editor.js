import { TILE, WORLD } from '../core/constants.js';
import { normalizeLevelConfig } from '../world/level-loader.js';
import { drawGrid, LevelInstance } from '../world/level-instance.js';
import { getTileDefinition, TILE_DEFINITIONS } from '../world/tile-registry.js';

/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 */

const DEFAULT_META = { id: 'debug-level', name: 'Debug Level' };

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config ?? {}));
}

function buildTileOptions() {
  return Object.values(TILE_DEFINITIONS)
    .slice()
    .sort((a, b) => a.tileId - b.tileId);
}

function describeTile(tileId) {
  const def = getTileDefinition(tileId);
  const label = def.id || def.variant || 'tile';
  return `${label} (#${def.tileId})`;
}

function createElement(root, tag, className) {
  const el = root.createElement(tag);
  if (className) {
    el.className = className;
  }
  return el;
}

export function createLevelEditorOverlay({
  documentRoot = typeof document !== 'undefined' ? document : null,
  host,
  spriteSheetPromise,
  initialConfig,
  onToggle,
} = {}) {
  if (!documentRoot) return null;

  const container = host ?? documentRoot.querySelector('.game-frame') ?? documentRoot.body;
  const overlay = createElement(documentRoot, 'section', 'overlay editor-overlay hidden');
  overlay.setAttribute('aria-label', 'Editor levelu');
  overlay.innerHTML = `
    <div class="editor-header">
      <div>
        <div class="panel-title">Debug editor</div>
        <p class="menu-subtitle">Klikni do mřížky a přepíšeš cílovou vrstvu.</p>
      </div>
      <button type="button" class="menu-button ghost small" data-editor-close>Zavřít</button>
    </div>
    <div class="editor-controls">
      <label class="editor-field">
        <span>Vrstva</span>
        <select data-editor-layer>
          <option value="decor">Dekor</option>
          <option value="collision">Kolize</option>
          <option value="decorUnlocked">Dekor (odemčeno)</option>
          <option value="collisionUnlocked">Kolize (odemčeno)</option>
        </select>
      </label>
      <label class="editor-field">
        <span>Typ</span>
        <select data-editor-category></select>
      </label>
      <label class="editor-field editor-tile-field">
        <span>Varianta</span>
        <select data-editor-tile></select>
      </label>
      <label class="editor-field editor-toggle">
        <input type="checkbox" data-editor-lighting checked />
        <span>Náhled osvětlení</span>
      </label>
      <div class="editor-actions">
        <button type="button" class="menu-button small" data-editor-export>Export JSON</button>
        <button type="button" class="menu-button ghost small" data-editor-import>Import JSON</button>
      </div>
    </div>
    <div class="editor-canvas-shell">
      <canvas data-editor-canvas aria-label="Mřížka levelu"></canvas>
    </div>
    <label class="editor-field editor-io">
      <span>Export/Import JSON</span>
      <textarea rows="6" spellcheck="false" data-editor-io placeholder="Sem vlož Tiled JSON nebo LevelConfig..."></textarea>
    </label>
    <p class="menu-subtitle" data-editor-status>Editor připraven.</p>
  `;

  container.appendChild(overlay);

  const canvas = overlay.querySelector('[data-editor-canvas]');
  const ctx = canvas?.getContext('2d');
  const ioField = overlay.querySelector('[data-editor-io]');
  const statusEl = overlay.querySelector('[data-editor-status]');
  const layerSelect = overlay.querySelector('[data-editor-layer]');
  const categorySelect = overlay.querySelector('[data-editor-category]');
  const tileSelect = overlay.querySelector('[data-editor-tile]');
  const lightingToggle = overlay.querySelector('[data-editor-lighting]');
  const closeButton = overlay.querySelector('[data-editor-close]');
  const exportButton = overlay.querySelector('[data-editor-export]');
  const importButton = overlay.querySelector('[data-editor-import]');

  const camera = { x: 0, y: 0 };
  let currentConfig = null;
  let level = null;
  let spriteSheet = null;
  let painting = false;
  let lightingPreview = true;

  spriteSheetPromise?.then((sheet) => {
    spriteSheet = sheet;
    renderPreview();
  });

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
  }

  function syncLightingToggle(checked) {
    lightingPreview = Boolean(checked);
    renderPreview();
  }

  function isOpen() {
    return !overlay.classList.contains('hidden');
  }

  function notifyToggle() {
    onToggle?.(isOpen());
  }

  function show() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    renderPreview();
    notifyToggle();
  }

  function hide() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    notifyToggle();
  }

  function toggle() {
    if (isOpen()) {
      hide();
    } else {
      show();
    }
  }

  function rebuildCategoryOptions() {
    if (!categorySelect) return;
    const categories = new Set(['all']);
    buildTileOptions().forEach((def) => categories.add(def.category ?? 'other'));
    categorySelect.innerHTML = '';
    categories.forEach((category) => {
      const option = createElement(documentRoot, 'option');
      option.value = category;
      option.textContent = category === 'all' ? 'Vše' : category;
      categorySelect.appendChild(option);
    });
  }

  function rebuildTileOptions(filterCategory = categorySelect?.value ?? 'all') {
    if (!tileSelect) return;
    tileSelect.innerHTML = '';
    const defs = buildTileOptions().filter(
      (def) => filterCategory === 'all' || def.category === filterCategory,
    );
    defs.forEach((def) => {
      const option = createElement(documentRoot, 'option');
      option.value = `${def.tileId}`;
      option.textContent = `${def.tileId} – ${def.id ?? def.variant ?? def.category}`;
      option.dataset.category = def.category ?? 'other';
      tileSelect.appendChild(option);
    });
    if (tileSelect.childElementCount > 0) {
      tileSelect.value = tileSelect.firstElementChild.value;
    }
  }

  function resolveTileCoordinates(event) {
    if (!canvas || !level) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= level.mapWidth || ty >= level.mapHeight) return null;
    return { tx, ty };
  }

  function updateHoverLabel(event) {
    if (!level) return;
    const coords = resolveTileCoordinates(event);
    if (!coords) return;
    const index = coords.ty * level.mapWidth + coords.tx;
    const decorTile = level.decorTiles[index];
    const collisionTile = level.collisionTiles[index];
    setStatus(
      `(${coords.tx}, ${coords.ty}) · dekor: ${describeTile(decorTile)} · kolize: ${describeTile(collisionTile)}`,
    );
  }

  function paintTile(event) {
    if (!level) return;
    const coords = resolveTileCoordinates(event);
    if (!coords) return;
    const index = coords.ty * level.mapWidth + coords.tx;
    const tileId = Number.parseInt(tileSelect?.value ?? '0', 10) || 0;
    const targetLayer = layerSelect?.value ?? 'decor';
    const target = level[`${targetLayer}`];
    const targetTiles = Array.isArray(target) ? target : level[`${targetLayer}Tiles`];
    if (!Array.isArray(targetTiles) || targetTiles[index] === tileId) return;

    targetTiles[index] = tileId;
    level.invalidateTiles([index]);
    renderPreview();
    setStatus(
      `Dlaždice ${describeTile(tileId)} nastavena na ${targetLayer} (${coords.tx}, ${coords.ty}).`,
    );
  }

  function renderPreview() {
    if (!ctx || !canvas || !level) return;
    const width = level.mapWidth || WORLD.width;
    const height = level.mapHeight || WORLD.height;
    canvas.width = width * TILE;
    canvas.height = height * TILE;

    drawGrid(ctx, canvas, { width, height });
    if (spriteSheet) {
      level.drawLevel(ctx, camera, spriteSheet);
    }

    if (lightingPreview && spriteSheet) {
      level.drawLighting(ctx, camera);
    }
  }

  function applyConfig(nextConfig) {
    try {
      const normalized = normalizeLevelConfig(nextConfig);
      currentConfig = cloneConfig({
        ...normalized,
        meta: { ...DEFAULT_META, ...(normalized.meta ?? {}) },
      });
      level = new LevelInstance(currentConfig);
      renderPreview();
      setStatus(`Načten level ${currentConfig.meta?.name ?? currentConfig.meta?.id ?? 'neznámý'}.`);
    } catch (err) {
      console.error('Editor import failed', err);
      setStatus('Import se nezdařil. Zkontroluj JSON a zkus to znovu.');
    }
  }

  function exportConfig() {
    if (!level || !ioField) return;
    const payload = cloneConfig(currentConfig ?? {});
    payload.meta = { ...DEFAULT_META, ...(payload.meta ?? {}) };
    payload.dimensions = payload.dimensions ?? { width: level.mapWidth, height: level.mapHeight };
    payload.tileLayers = {
      ...(payload.tileLayers ?? {}),
      collision: [...level.collisionTiles],
      decor: [...level.decorTiles],
      collisionUnlocked: [...level.collisionUnlocked],
      decorUnlocked: [...level.decorUnlocked],
    };
    ioField.value = JSON.stringify(payload, null, 2);
    setStatus('Export hotov — JSON je připraven v textovém poli.');
  }

  function importFromText() {
    if (!ioField) return;
    try {
      const parsed = JSON.parse(ioField.value || '{}');
      applyConfig(parsed);
      setStatus('JSON načten, editor přegeneroval náhled.');
    } catch (err) {
      console.error('Editor JSON parse failed', err);
      setStatus('JSON se nepodařilo načíst — je validní?');
    }
  }

  function resetIoField(config) {
    if (!ioField) return;
    ioField.value = JSON.stringify(config ?? {}, null, 2);
  }

  function attachEvents() {
    if (canvas) {
      canvas.addEventListener('pointerdown', (event) => {
        painting = true;
        paintTile(event);
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', (event) => {
        if (painting) {
          paintTile(event);
        } else {
          updateHoverLabel(event);
        }
      });
      canvas.addEventListener('pointerup', () => {
        painting = false;
      });
      canvas.addEventListener('pointerleave', () => {
        painting = false;
      });
    }

    if (lightingToggle) {
      lightingToggle.addEventListener('change', (event) => {
        syncLightingToggle(event.currentTarget.checked);
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', (event) => {
        rebuildTileOptions(event.currentTarget.value);
      });
    }

    closeButton?.addEventListener('click', hide);
    exportButton?.addEventListener('click', exportConfig);
    importButton?.addEventListener('click', importFromText);
    documentRoot.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        hide();
      }
    });
  }

  rebuildCategoryOptions();
  rebuildTileOptions();
  attachEvents();

  if (initialConfig) {
    applyConfig(initialConfig);
    resetIoField(initialConfig);
  }

  return {
    show,
    hide,
    toggle,
    isOpen,
    setLevel(nextLevel) {
      if (!nextLevel?.config) return;
      applyConfig(cloneConfig(nextLevel.config));
      resetIoField(nextLevel.config);
    },
    setConfig(config) {
      applyConfig(config);
      resetIoField(config);
    },
  };
}
