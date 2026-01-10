import {
  getDecorVariantTileId,
  getDestroyOverlayTileId,
  getFloorVariantTileId,
  getTileDefinition,
  getWallVariantTileId,
  TILE_IDS,
} from '../src/world/tile-registry.js';
import { abandonedLaboratoryLevel } from '../src/data/levels/1-abandoned-laboratory/index.js';
import { prologueLevel } from '../src/data/levels/0-prologue/index.js';
import { northernWingLevel } from '../src/data/levels/2-northern-wing/index.js';
import { rooftopCorridorLevel } from '../src/data/levels/3-rooftop-corridor/index.js';
import { hospitalLevel } from '../src/data/levels/4-hospital/index.js';

const levels = [
  { id: 'prologue', name: 'Prolog', config: prologueLevel },
  { id: 'abandoned-laboratory', name: 'Opuštěná laboratoř', config: abandonedLaboratoryLevel },
  { id: 'northern-wing', name: 'Severní křídlo', config: northernWingLevel },
  { id: 'rooftop-corridor', name: 'Střešní koridor', config: rooftopCorridorLevel },
  { id: 'hospital', name: 'Nemocnice', config: hospitalLevel },
];

const palette = [
  { label: 'Floor 1', tileId: getFloorVariantTileId(1) },
  { label: 'Floor 2', tileId: getFloorVariantTileId(2) },
  { label: 'Floor 3', tileId: getFloorVariantTileId(3) },
  { label: 'Floor 4', tileId: getFloorVariantTileId(4) },
  { label: 'Wall 1', tileId: getWallVariantTileId(1) },
  { label: 'Wall 2', tileId: getWallVariantTileId(2) },
  { label: 'Wall 3', tileId: getWallVariantTileId(3) },
  { label: 'Wall 4', tileId: getWallVariantTileId(4) },
  { label: 'Door closed', tileId: TILE_IDS.DOOR_CLOSED },
  { label: 'Door open', tileId: TILE_IDS.DOOR_OPEN },
  { label: 'Decor console', tileId: TILE_IDS.DECOR_CONSOLE },
  { label: 'Decor 1', tileId: getDecorVariantTileId(1) },
  { label: 'Decor 2', tileId: getDecorVariantTileId(2) },
  { label: 'Decor 3', tileId: getDecorVariantTileId(3) },
  { label: 'Decor 4', tileId: getDecorVariantTileId(4) },
  { label: 'Destroy 1', tileId: getDestroyOverlayTileId(1) },
  { label: 'Destroy 2', tileId: getDestroyOverlayTileId(2) },
  { label: 'Destroy 3', tileId: getDestroyOverlayTileId(3) },
  { label: 'Floor broken', tileId: TILE_IDS.FLOOR_BROKEN },
];

const elements = {
  levelSelect: document.querySelector('[data-level-select]'),
  palette: document.querySelector('[data-palette]'),
  grid: document.querySelector('[data-grid]'),
  mapMeta: document.querySelector('[data-map-meta]'),
  mapCode: document.querySelector('[data-map-code]'),
  npcCode: document.querySelector('[data-npc-code]'),
  destroyOverlay: document.querySelector('[data-destroy-overlay]'),
  destroyFloor: document.querySelector('[data-destroy-floor]'),
  npcList: document.querySelector('[data-npc-list]'),
  addNpc: document.querySelector('[data-add-npc]'),
};

const state = {
  mode: 'collision',
  selectedTileId: palette[0].tileId,
  destroyOverlayTileId: getDestroyOverlayTileId(1),
  destroyFloorTileId: getFloorVariantTileId(1),
  width: 0,
  height: 0,
  tileLayers: {
    collision: [],
    decor: [],
    destroyedFloors: [],
  },
  lighting: {
    sources: [],
  },
  npcs: [],
};

function getLevelDimensions(config) {
  const preferred = config.dimensions ?? config.meta?.dimensions ?? {};
  return {
    width: preferred.width ?? config.width ?? 0,
    height: preferred.height ?? config.height ?? 0,
  };
}

function buildEmptyLayer(length, fallback) {
  return Array.from({ length }, () => fallback);
}

function loadLevel(level) {
  const { width, height } = getLevelDimensions(level.config);
  const size = width * height;
  const layers = level.config.tileLayers ?? {};
  const fallback = level.config.map ?? [];
  const collision = layers.collision?.length ? [...layers.collision] : [...fallback];
  const decor = layers.decor?.length ? [...layers.decor] : [...collision];
  const destroyedFloors = layers.destroyedFloors?.length ? [...layers.destroyedFloors] : [];

  state.width = width;
  state.height = height;
  state.tileLayers = {
    collision: collision.length === size ? collision : buildEmptyLayer(size, getFloorVariantTileId(1)),
    decor: decor.length === size ? decor : buildEmptyLayer(size, getFloorVariantTileId(1)),
    destroyedFloors:
      destroyedFloors.length === size ? destroyedFloors : buildEmptyLayer(size, null),
  };
  state.lighting = {
    sources: level.config.lighting?.sources ? [...level.config.lighting.sources] : [],
  };
  state.npcs = level.config.actors?.npcs ? level.config.actors.npcs.map((npc) => ({ ...npc })) : [];
  render();
}

function renderPalette() {
  elements.palette.innerHTML = '';
  palette.forEach((entry) => {
    const button = document.createElement('button');
    const def = getTileDefinition(entry.tileId);
    const color = getTileColor(def.category);
    button.type = 'button';
    button.classList.toggle('is-active', state.selectedTileId === entry.tileId);
    button.innerHTML = `
      <div class="swatch" style="background:${color}"></div>
      <strong>${entry.label}</strong>
      <span>${entry.tileId}</span>
    `;
    button.addEventListener('click', () => {
      state.selectedTileId = entry.tileId;
      renderPalette();
    });
    elements.palette.appendChild(button);
  });
}

function renderDestroySelect(select, selectedId, filterFn) {
  select.innerHTML = '';
  palette.filter(filterFn).forEach((entry) => {
    const option = document.createElement('option');
    option.value = String(entry.tileId);
    option.textContent = `${entry.label} (${entry.tileId})`;
    if (entry.tileId === selectedId) option.selected = true;
    select.appendChild(option);
  });
}

function renderNpcList() {
  elements.npcList.innerHTML = '';
  state.npcs.forEach((npc, index) => {
    const row = document.createElement('div');
    row.className = 'npc-row';
    row.innerHTML = `
      <input type="text" placeholder="id" value="${npc.id ?? ''}" data-field="id" data-index="${index}" />
      <input type="text" placeholder="scriptId" value="${npc.scriptId ?? ''}" data-field="scriptId" data-index="${index}" />
      <input type="number" placeholder="tx" value="${npc.tx ?? ''}" data-field="tx" data-index="${index}" />
      <input type="number" placeholder="ty" value="${npc.ty ?? ''}" data-field="ty" data-index="${index}" />
      <button type="button" class="remove" data-remove="${index}">✕</button>
    `;
    row.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const target = event.target;
        const field = target.dataset.field;
        const idx = Number.parseInt(target.dataset.index, 10);
        if (!Number.isFinite(idx) || !field) return;
        const value = target.type === 'number' ? Number.parseInt(target.value, 10) : target.value.trim();
        state.npcs[idx] = { ...state.npcs[idx], [field]: Number.isNaN(value) ? null : value };
        renderOutputs();
      });
    });
    row.querySelector('[data-remove]')?.addEventListener('click', () => {
      state.npcs.splice(index, 1);
      renderNpcList();
      renderOutputs();
    });
    elements.npcList.appendChild(row);
  });
}

function getTileColor(category) {
  switch (category) {
    case 'wall':
      return '#3e4c7a';
    case 'door':
      return '#8a5d3d';
    case 'decor':
      return '#4d7a5a';
    case 'overlay':
      return '#7a4d4d';
    case 'floor':
    default:
      return '#243055';
  }
}

function renderGrid() {
  const { width, height } = state;
  elements.grid.style.gridTemplateColumns = `repeat(${width}, 32px)`;
  elements.grid.innerHTML = '';
  const lightIndices = new Set(state.lighting.sources.map((source) => source.ty * width + source.tx));

  for (let ty = 0; ty < height; ty += 1) {
    for (let tx = 0; tx < width; tx += 1) {
      const index = ty * width + tx;
      const button = document.createElement('button');
      button.type = 'button';
      const collisionId = state.tileLayers.collision[index];
      const decorId = state.tileLayers.decor[index];
      const def = getTileDefinition(collisionId);
      button.style.background = getTileColor(def.category);
      button.classList.toggle('is-light', lightIndices.has(index));
      button.innerHTML = `<span>${decorId}</span>`;
      button.addEventListener('click', () => handleTileClick(tx, ty, index));
      elements.grid.appendChild(button);
    }
  }
}

function handleTileClick(tx, ty, index) {
  if (state.mode === 'light') {
    const existingIndex = state.lighting.sources.findIndex((source) => source.tx === tx && source.ty === ty);
    if (existingIndex >= 0) {
      state.lighting.sources.splice(existingIndex, 1);
    } else {
      state.lighting.sources.push({ tx, ty });
    }
    renderGrid();
    renderOutputs();
    return;
  }

  if (state.mode === 'destruction') {
    state.tileLayers.decor[index] = state.destroyOverlayTileId;
    state.tileLayers.destroyedFloors[index] = state.destroyFloorTileId;
  } else if (state.mode === 'decor') {
    state.tileLayers.decor[index] = state.selectedTileId;
  } else {
    state.tileLayers.collision[index] = state.selectedTileId;
  }

  renderGrid();
  renderOutputs();
}

function renderOutputs() {
  const mapPayload = {
    dimensions: { width: state.width, height: state.height },
    tileLayers: {
      collision: state.tileLayers.collision,
      decor: state.tileLayers.decor,
      destroyedFloors: state.tileLayers.destroyedFloors,
    },
    lighting: {
      sources: state.lighting.sources,
    },
  };
  elements.mapCode.value = JSON.stringify(mapPayload, null, 2);
  elements.npcCode.value = JSON.stringify(state.npcs, null, 2);
}

function render() {
  elements.mapMeta.textContent = `Rozměr mapy: ${state.width} × ${state.height} · Světla: ${state.lighting.sources.length} · NPC: ${state.npcs.length}`;
  renderPalette();
  renderDestroySelect(
    elements.destroyOverlay,
    state.destroyOverlayTileId,
    (entry) => getTileDefinition(entry.tileId).category === 'overlay',
  );
  renderDestroySelect(
    elements.destroyFloor,
    state.destroyFloorTileId,
    (entry) => getTileDefinition(entry.tileId).category === 'floor',
  );
  renderGrid();
  renderNpcList();
  renderOutputs();
}

levels.forEach((level) => {
  const option = document.createElement('option');
  option.value = level.id;
  option.textContent = level.name;
  elements.levelSelect.appendChild(option);
});

elements.levelSelect.addEventListener('change', (event) => {
  const selected = levels.find((level) => level.id === event.target.value);
  if (selected) loadLevel(selected);
});

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', (event) => {
    state.mode = event.target.value;
  });
});

elements.destroyOverlay.addEventListener('change', (event) => {
  state.destroyOverlayTileId = Number.parseInt(event.target.value, 10);
});

elements.destroyFloor.addEventListener('change', (event) => {
  state.destroyFloorTileId = Number.parseInt(event.target.value, 10);
});

elements.addNpc.addEventListener('click', () => {
  state.npcs.push({ id: '', scriptId: '', tx: 0, ty: 0 });
  renderNpcList();
  renderOutputs();
});

loadLevel(levels[0]);
