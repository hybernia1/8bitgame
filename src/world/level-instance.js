/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 * @typedef {import('../data/types.js').TileLayers} TileLayers
 */

import { COLORS, TILE, WORLD } from '../core/constants.js';
import { isOccupyingTile } from '../utils/geometry.js';
import { getDecorVariantIndex, getTileDefinition, isBlockingTileId, TILE_IDS } from './tile-registry.js';

const DOOR_TILE = TILE_IDS.DOOR_CLOSED;
const FLOOR_TILE = TILE_IDS.FLOOR_PLAIN;
const DEFAULT_COLLISION_TILE = TILE_IDS.WALL_SOLID;
const DEFAULT_DESTRUCTIBLE_HP = 1;
const LIGHTING_SHADOW_COLOR = 'rgba(4, 6, 14, 0.78)';
const LIGHTING_TINT_COLOR = 'rgba(255, 221, 164, 0.12)';
const DEFAULT_LIGHT_COLOR = 'rgba(255, 214, 153, 0.32)';

function toIndex(entry, width) {
  if (Number.isInteger(entry?.index)) return entry.index;
  if (Number.isInteger(entry?.tx) && Number.isInteger(entry?.ty)) return entry.ty * width + entry.tx;
  return null;
}

function normalizeUnlockMask(tileLayers, width) {
  const baseCollision = tileLayers.collision ?? [];
  const baseDecor = tileLayers.decor ?? baseCollision;
  const fallbackUnlockMask = tileLayers.unlockMask ?? [];
  const collisionUnlocked = tileLayers.collisionUnlocked ?? [];
  const decorUnlocked = tileLayers.decorUnlocked ?? [];
  const expectedSize = Math.max(baseCollision.length, baseDecor.length);

  /** @type {Map<number, { index: number, collision?: number, decor?: number, tile?: number }>} */
  const merged = new Map();

  function mergePatch(index, patch) {
    const existing = merged.get(index) ?? { index };
    if (patch.tile != null) existing.tile = patch.tile;
    if (patch.collision != null) existing.collision = patch.collision;
    if (patch.decor != null) existing.decor = patch.decor;
    if (patch.tileId != null && existing.tile == null) existing.tile = patch.tileId;
    merged.set(index, existing);
  }

  fallbackUnlockMask.forEach((entry) => {
    const index = toIndex(entry, width);
    if (!Number.isInteger(index)) {
      throw new Error('Unlock mask entry is missing a valid index, tx, or ty.');
    }
    if (expectedSize && (index < 0 || index >= expectedSize)) {
      throw new Error(`Unlock mask entry ${index} falls outside the map bounds.`);
    }
    mergePatch(index, entry);
  });

  if (collisionUnlocked.length && collisionUnlocked.length !== expectedSize) {
    throw new Error(
      `Unlocked collision layer size mismatch: expected ${expectedSize} tiles but received ${collisionUnlocked.length}.`,
    );
  }
  if (decorUnlocked.length && decorUnlocked.length !== expectedSize) {
    throw new Error(
      `Unlocked decor layer size mismatch: expected ${expectedSize} tiles but received ${decorUnlocked.length}.`,
    );
  }

  if (collisionUnlocked.length === expectedSize) {
    collisionUnlocked.forEach((value, index) => {
      if (value === baseCollision[index]) return;
      mergePatch(index, { collision: value });
    });
  }

  if (decorUnlocked.length === expectedSize) {
    decorUnlocked.forEach((value, index) => {
      if (value === baseDecor[index]) return;
      mergePatch(index, { decor: value });
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.index - b.index);
}

function getTileHitPoints(tileId) {
  const def = getTileDefinition(tileId);
  const baseHp = def.hitPoints ?? DEFAULT_DESTRUCTIBLE_HP;
  return Math.max(1, Math.floor(baseHp));
}

function resolveDestructibleTile(collisionTileId, decorTileId) {
  const decorDef = getTileDefinition(decorTileId);
  if (decorDef.hitPoints != null) {
    return { tileId: decorTileId, layer: 'decor' };
  }

  const collisionDef = getTileDefinition(collisionTileId);
  if (collisionDef.hitPoints != null) {
    return { tileId: collisionTileId, layer: 'collision' };
  }

  return null;
}

function resolveTileLayers(config) {
  const layers = config.tileLayers ?? {};
  const fallback = config.map ?? [];
  const collision = layers.collision ?? fallback;
  const decor = layers.decor ?? collision;
  return {
    collision: [...collision],
    decor: [...decor],
    destroyedFloors: layers.destroyedFloors ? [...layers.destroyedFloors] : [],
    collisionUnlocked: layers.collisionUnlocked ? [...layers.collisionUnlocked] : [],
    decorUnlocked: layers.decorUnlocked ? [...layers.decorUnlocked] : [],
    unlockMask: layers.unlockMask ?? config.unlockMask ?? [],
  };
}

function resolveDimensions(levelConfig, tileLayers) {
  const preferred = levelConfig.dimensions ?? levelConfig.meta?.dimensions ?? {};
  const providedWidth = preferred.width ?? levelConfig.width;
  const providedHeight = preferred.height ?? levelConfig.height;

  let width = Number.isInteger(providedWidth) ? providedWidth : null;
  let height = Number.isInteger(providedHeight) ? providedHeight : null;

  const collisionLength = tileLayers.collision?.length ?? 0;

  if (width && !height && collisionLength) {
    const derived = collisionLength / width;
    if (!Number.isInteger(derived)) {
      throw new Error(
        `Invalid map dimensions: expected rows of ${width} tiles but got ${collisionLength} entries.`,
      );
    }
    height = derived;
  }

  if (height && !width && collisionLength) {
    const derived = collisionLength / height;
    if (!Number.isInteger(derived)) {
      throw new Error(
        `Invalid map dimensions: expected ${height} rows but collision layer has ${collisionLength} tiles.`,
      );
    }
    width = derived;
  }

  if (!width || !height) {
    const totalTiles = collisionLength || tileLayers.decor?.length || levelConfig.map?.length || 0;
    if (totalTiles > 0) {
      const sqrt = Math.sqrt(totalTiles);
      if (Number.isInteger(sqrt)) {
        width = width ?? sqrt;
        height = height ?? sqrt;
      }
    }
  }

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Level is missing valid dimensions.');
  }

  return { width, height };
}

export class LevelInstance {
  /**
   * @param {LevelConfig} levelConfig
   */
  constructor(levelConfig) {
    this.config = levelConfig;
    this.meta = levelConfig.meta ?? { name: 'Unknown Sector' };

    this.layers = {
      decor: { canvas: null, context: null },
      collision: { canvas: null, context: null },
    };
    this.lightingLayer = { canvas: null, context: null };
    this.dynamicDecor = [];
    this.dynamicDecorIndices = new Set();
    this.dynamicDecorDirty = true;
    this.layerSpriteSheet = null;
    this.layerDirtyAll = true;
    this.lightingDirtyAll = true;
    this.dirtyTileIndices = new Set();
    this.dirtyLightingIndices = new Set();

    const tileLayers = resolveTileLayers(levelConfig);
    const { width, height } = resolveDimensions(levelConfig, tileLayers);
    this.mapWidth = width;
    this.mapHeight = height;

    this.collisionBase = tileLayers.collision;
    this.decorBase = tileLayers.decor;
    this.destroyedFloorBase = tileLayers.destroyedFloors;
    this.unlockMask = normalizeUnlockMask(tileLayers, this.mapWidth);
    this.unlockMaskByIndex = new Map(this.unlockMask.map((entry) => [entry.index, entry]));

    const expectedSize = this.mapWidth * this.mapHeight;
    if (this.collisionBase.length !== expectedSize) {
      throw new Error(
        `Collision layer size mismatch: expected ${expectedSize} tiles but received ${this.collisionBase.length}.`,
      );
    }
    if (this.decorBase.length !== expectedSize) {
      throw new Error(
        `Decor layer size mismatch: expected ${expectedSize} tiles but received ${this.decorBase.length}.`,
      );
    }
    if (this.destroyedFloorBase.length && this.destroyedFloorBase.length !== expectedSize) {
      throw new Error(
        `Destroyed floor layer size mismatch: expected ${expectedSize} tiles but received ${this.destroyedFloorBase.length}.`,
      );
    }

    this.actorPlacements = levelConfig.actors ?? {};
    this.interactables = levelConfig.interactables ?? {};
    this.gateConfig = this.interactables.gate ?? null;
    this.pressureSwitchConfig = this.interactables.pressureSwitches ?? [];

    this.lightingConfig = {
      ...(levelConfig.lighting ?? {}),
      switches: this.interactables.switches ?? levelConfig.lighting?.switches ?? [],
    };

    this.resetState();
  }

  resetState() {
    this.collisionTiles = [...this.collisionBase];
    this.decorTiles = [...this.decorBase];
    const destroyedFloorDefault = new Array(this.mapWidth * this.mapHeight).fill(null);
    this.destroyedFloors =
      this.destroyedFloorBase.length === this.mapWidth * this.mapHeight
        ? [...this.destroyedFloorBase]
        : destroyedFloorDefault;
    this.destructibleTiles = new Map();
    this.dynamicDecorDirty = true;
    this.dynamicDecor = [];
    this.dynamicDecorIndices = new Set();
    this.gate = this.gateConfig
      ? {
          ...this.gateConfig,
          locked: this.gateConfig.locked ?? true,
        }
      : null;
    this.gateIndex = this.gate ? this.gate.ty * this.mapWidth + this.gate.tx : null;
    this.gateOpenTile = this.gate?.openTile ?? FLOOR_TILE;
    this.sealedTiles = this.gate?.sealedTiles ?? [];
    this.sealedTileIndices = this.gateIndex === null ? [] : this.sealedTiles.map(([tx, ty]) => ty * this.mapWidth + tx);
    this.sealedCollisionOriginals =
      this.gateIndex === null ? [] : this.sealedTileIndices.map((index) => this.getUnlockedTileValue(index, 'collision'));
    this.sealedDecorOriginals =
      this.gateIndex === null ? [] : this.sealedTileIndices.map((index) => this.getUnlockedTileValue(index, 'decor'));

    this.lightTiles = new Array(this.mapWidth * this.mapHeight).fill(false);
    this.lightSwitches = (this.lightingConfig.switches ?? []).map((sw) => ({
      ...sw,
      timerSeconds: Number.isFinite(sw.timerSeconds) ? sw.timerSeconds : sw.timer,
      activated: false,
      timerRemaining: null,
    }));
    this.pressureSwitches = [];
    this.tileEffects = new Array(this.mapWidth * this.mapHeight).fill(null);
    this.tileEffectsCount = 0;

    this.rebuildLighting();
    this.invalidateAllLayers();

    if (this.gateIndex !== null) {
      if (this.collisionTiles[this.gateIndex] !== DOOR_TILE) {
        this.collisionTiles[this.gateIndex] = DOOR_TILE;
      }
      if (this.decorTiles[this.gateIndex] !== DOOR_TILE) {
        this.decorTiles[this.gateIndex] = DOOR_TILE;
      }
    }

    this.rebuildTileEffects();
    this.initializePressureSwitches();
    this.initializeDestructibleTiles();
  }

  getUnlockedTileValue(index, layer) {
    const patch = this.unlockMaskByIndex.get(index);
    if (!patch) return layer === 'collision' ? this.collisionBase[index] : this.decorBase[index];
    if (layer === 'collision') {
      if (Number.isInteger(patch.collision)) return patch.collision;
      if (Number.isInteger(patch.tile)) return patch.tile;
      if (Number.isInteger(patch.tileId)) return patch.tileId;
      if (Number.isInteger(patch.decor)) return patch.decor;
      return this.collisionBase[index];
    }
    if (Number.isInteger(patch.decor)) return patch.decor;
    if (Number.isInteger(patch.tile)) return patch.tile;
    if (Number.isInteger(patch.tileId)) return patch.tileId;
    if (Number.isInteger(patch.collision)) return patch.collision;
    return this.decorBase[index];
  }

  applyUnlockMask() {
    if (!this.unlockMask.length) return [];
    const changed = new Set();
    this.unlockMask.forEach((entry) => {
      const { index } = entry;
      if (!Number.isInteger(index) || index < 0 || index >= this.collisionTiles.length) return;
      const shared = Number.isInteger(entry.tile) ? entry.tile : Number.isInteger(entry.tileId) ? entry.tileId : null;
      const nextCollision = Number.isInteger(entry.collision) ? entry.collision : shared;
      const nextDecor = Number.isInteger(entry.decor) ? entry.decor : shared;

      if (nextCollision != null && this.collisionTiles[index] !== nextCollision) {
        this.collisionTiles[index] = nextCollision;
        changed.add(index);
      }
      if (nextDecor != null && this.decorTiles[index] !== nextDecor) {
        this.decorTiles[index] = nextDecor;
        changed.add(index);
      }
    });

    const changedIndices = Array.from(changed);
    if (changedIndices.length) {
      this.invalidateTiles(changedIndices);
    }
    return changedIndices;
  }

  invalidateAllLayers() {
    this.layers.decor.canvas = null;
    this.layers.decor.context = null;
    this.layers.collision.canvas = null;
    this.layers.collision.context = null;
    this.lightingLayer.canvas = null;
    this.lightingLayer.context = null;
    this.layerSpriteSheet = null;
    this.layerDirtyAll = true;
    this.lightingDirtyAll = true;
    this.dirtyTileIndices = new Set();
    this.dirtyLightingIndices = new Set();
    this.dynamicDecorDirty = true;
    this.dynamicDecor = [];
    this.dynamicDecorIndices = new Set();
    this.rebuildTileEffects();
  }

  rebuildLighting() {
    const nextTiles = new Array(this.mapWidth * this.mapHeight).fill(false);
    const sources = this.getLightingSources();
    if (!sources.length) {
      this.updateLightingTiles(nextTiles);
      return;
    }

    const queue = [];
    sources.forEach(({ tx, ty }) => {
      if (!Number.isInteger(tx) || !Number.isInteger(ty)) return;
      if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return;
      const index = ty * this.mapWidth + tx;
      const tileId = this.collisionTiles[index];
      if (this.isLightBlockingTile(tileId)) return;
      nextTiles[index] = true;
      if (!this.isOpenDoorTile(tileId)) {
        queue.push({ tx, ty });
      }
    });

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (queue.length) {
      const current = queue.shift();
      directions.forEach(({ dx, dy }) => {
        const nx = current.tx + dx;
        const ny = current.ty + dy;
        if (nx < 0 || ny < 0 || nx >= this.mapWidth || ny >= this.mapHeight) return;
        const nIndex = ny * this.mapWidth + nx;
        const nTile = this.collisionTiles[nIndex];
        if (this.isLightBlockingTile(nTile)) return;

        if (this.isOpenDoorTile(nTile)) {
          nextTiles[nIndex] = true;
          const bx = nx + dx;
          const by = ny + dy;
          if (bx < 0 || by < 0 || bx >= this.mapWidth || by >= this.mapHeight) return;
          const bIndex = by * this.mapWidth + bx;
          const bTile = this.collisionTiles[bIndex];
          if (this.isLightBlockingTile(bTile)) return;
          nextTiles[bIndex] = true;
          return;
        }

        if (nextTiles[nIndex]) return;
        nextTiles[nIndex] = true;
        queue.push({ tx: nx, ty: ny });
      });
    }

    this.updateLightingTiles(nextTiles);
  }

  updateLightingTiles(nextTiles) {
    const dirty = [];
    nextTiles.forEach((value, index) => {
      if (this.lightTiles[index] !== value) {
        dirty.push(index);
      }
    });
    this.lightTiles = nextTiles;
    if (dirty.length) {
      this.invalidateLighting(dirty);
    }
  }

  getLightingSources() {
    const sources = [];
    const addSource = ({ tx, ty, x, y }) => {
      let resolvedTx = tx;
      let resolvedTy = ty;
      if (!Number.isInteger(resolvedTx) || !Number.isInteger(resolvedTy)) {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          resolvedTx = Math.floor(x / TILE);
          resolvedTy = Math.floor(y / TILE);
        }
      }
      if (!Number.isInteger(resolvedTx) || !Number.isInteger(resolvedTy)) return;
      sources.push({ tx: resolvedTx, ty: resolvedTy });
    };

    const baseSources = this.lightingConfig.sources ?? [];
    baseSources.forEach((entry) => addSource(entry));

    if (!baseSources.length && this.lightingConfig.litZones?.length) {
      this.lightingConfig.litZones.forEach((zone) => {
        addSource({
          tx: Math.floor(zone.x + zone.w / 2),
          ty: Math.floor(zone.y + zone.h / 2),
        });
      });
    }

    this.lightSwitches.forEach((sw) => {
      if (!sw.activated) return;
      addSource(sw);
    });

    return sources;
  }

  isLightBlockingTile(tileId) {
    const def = getTileDefinition(tileId);
    if (def.category === 'wall') return true;
    if (def.category === 'door' && def.blocksMovement !== false) return true;
    return false;
  }

  isOpenDoorTile(tileId) {
    const def = getTileDefinition(tileId);
    return def.category === 'door' && def.blocksMovement === false;
  }

  initializeDestructibleTiles() {
    this.collisionTiles.forEach((_, index) => this.refreshDestructibleTile(index));
  }

  refreshDestructibleTiles(indices = []) {
    indices.forEach((index) => this.refreshDestructibleTile(index));
  }

  refreshDestructibleTile(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.collisionTiles.length) return;
    const destructible = resolveDestructibleTile(this.collisionTiles[index], this.decorTiles[index]);
    if (destructible) {
      const currentHp = this.destructibleTiles.get(index);
      this.destructibleTiles.set(index, currentHp ?? getTileHitPoints(destructible.tileId));
    } else {
      this.destructibleTiles.delete(index);
    }
  }

  getDestroyedFloorTile(index) {
    const fallback = this.destroyedFloors?.[index];
    if (Number.isInteger(fallback)) return fallback;
    return FLOOR_TILE;
  }

  damageTileAt(x, y, amount = 1) {
    const index = this.getTileIndexAt(x, y);
    if (index === null) {
      return false;
    }
    if (!this.destructibleTiles.has(index)) return false;

    const destructible = resolveDestructibleTile(this.collisionTiles[index], this.decorTiles[index]);
    if (!destructible) {
      this.destructibleTiles.delete(index);
      return false;
    }

    const damage = Math.max(1, Math.floor(amount));
    const nextHp = (this.destructibleTiles.get(index) ?? getTileHitPoints(destructible.tileId)) - damage;
    if (nextHp > 0) {
      this.destructibleTiles.set(index, nextHp);
      return true;
    }

    this.destructibleTiles.delete(index);
    const destroyedFloor = this.getDestroyedFloorTile(index);
    this.collisionTiles[index] = destroyedFloor;
    this.decorTiles[index] = destroyedFloor;
    this.invalidateTiles([index]);
    this.rebuildLighting();
    return true;
  }

  getTileIndexAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) {
      return null;
    }
    return ty * this.mapWidth + tx;
  }

  getTileLayersAt(x, y) {
    const index = this.getTileIndexAt(x, y);
    if (index === null) return null;
    return {
      index,
      tx: index % this.mapWidth,
      ty: Math.floor(index / this.mapWidth),
      collision: this.collisionTiles[index],
      decor: this.decorTiles[index],
    };
  }

  tileAt(x, y) {
    const index = this.getTileIndexAt(x, y);
    if (index === null) {
      return DEFAULT_COLLISION_TILE;
    }
    return this.collisionTiles[index];
  }

  canMove(size, nx, ny) {
    const half = size / 2;
    const corners = [
      [nx - half, ny - half],
      [nx + half, ny - half],
      [nx - half, ny + half],
      [nx + half, ny + half],
    ];
    return corners.every(([x, y]) => !isBlockingTileId(this.tileAt(x, y)));
  }

  drawLevel(ctx, camera, spriteSheet) {
    this.ensureLayers(spriteSheet);
    const { canvas: decorCanvas } = this.layers.decor;
    if (!decorCanvas) return;

    const sourceX = Math.max(0, Math.floor(camera.x));
    const sourceY = Math.max(0, Math.floor(camera.y));
    const sourceWidth = Math.min(ctx.canvas.width, decorCanvas.width - sourceX);
    const sourceHeight = Math.min(ctx.canvas.height, decorCanvas.height - sourceY);
    ctx.drawImage(decorCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    this.drawDynamicDecor(ctx, camera);
  }

  drawDynamicDecor(ctx, camera) {
    if (!this.dynamicDecor.length) return;
    this.dynamicDecor.forEach(({ image, x, y }) => {
      const dx = x - camera.x;
      const dy = y - camera.y;
      if (dx > ctx.canvas.width || dy > ctx.canvas.height || dx + TILE < 0 || dy + TILE < 0) return;
      ctx.drawImage(image, dx, dy, TILE, TILE);
    });
  }

  drawLightSwitches(ctx, camera) {
    ctx.save();
    this.lightSwitches.forEach((sw) => {
      const x = sw.tx * TILE - camera.x;
      const y = sw.ty * TILE - camera.y;
      ctx.fillStyle = sw.activated ? '#6ef2a4' : '#9bd9ff';
      ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 5, 10, 10);
      ctx.strokeStyle = sw.activated ? '#1d5c3b' : '#4f80ad';
      ctx.strokeRect(x + TILE / 2 - 6, y + TILE / 2 - 6, 12, 12);
    });
    ctx.restore();
  }

  drawPressureSwitches(ctx, camera) {
    if (!this.pressureSwitches.length) return;
    ctx.save();
    this.pressureSwitches.forEach((plate) => {
      const px = plate.tx * TILE - camera.x;
      const py = plate.ty * TILE - camera.y;
      const active = plate.activated;
      const margin = 6;
      const innerMargin = 12;

      ctx.fillStyle = active ? 'rgba(110, 242, 164, 0.14)' : 'rgba(242, 212, 92, 0.12)';
      ctx.strokeStyle = active ? '#6ef2a4' : COLORS.doorAccent;
      ctx.lineWidth = 2;
      ctx.fillRect(px + margin, py + margin, TILE - margin * 2, TILE - margin * 2);
      ctx.strokeRect(px + margin, py + margin, TILE - margin * 2, TILE - margin * 2);

      ctx.fillStyle = active ? '#6ef2a4' : '#f28f5c';
      ctx.fillRect(px + innerMargin, py + innerMargin, TILE - innerMargin * 2, TILE - innerMargin * 2);
    });
    ctx.restore();
  }

  drawLighting(ctx, camera) {
    this.ensureLightingLayer();
    const { canvas: lightingCanvas } = this.lightingLayer;
    if (!lightingCanvas) return;

    const sourceX = Math.max(0, Math.floor(camera.x));
    const sourceY = Math.max(0, Math.floor(camera.y));
    const sourceWidth = Math.min(ctx.canvas.width, lightingCanvas.width - sourceX);
    const sourceHeight = Math.min(ctx.canvas.height, lightingCanvas.height - sourceY);
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = 0.75;
    ctx.drawImage(
      lightingCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(
      lightingCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );
    ctx.restore();
  }

  clampCamera(camera, player, canvas) {
    camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, this.mapWidth * TILE - canvas.width));
    camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, this.mapHeight * TILE - canvas.height));
  }

  getGateState() {
    if (!this.gate) return null;
    return { ...this.gate, x: this.gate.tx * TILE + TILE / 2, y: this.gate.ty * TILE + TILE / 2 };
  }

  unlockGate() {
    if (!this.gate || !this.gate.locked) return;
    this.gate.locked = false;
    const changed = new Set(this.applyUnlockMask());
    if (this.gateIndex !== null) {
      this.collisionTiles[this.gateIndex] = this.gateOpenTile;
      this.decorTiles[this.gateIndex] = this.gateOpenTile;
      changed.add(this.gateIndex);
    }
    this.sealedTileIndices.forEach((index, i) => {
      this.collisionTiles[index] = this.sealedCollisionOriginals[i] ?? FLOOR_TILE;
      this.decorTiles[index] = this.sealedDecorOriginals[i] ?? FLOOR_TILE;
      changed.add(index);
    });

    const changedArray = Array.from(changed).filter((idx) => Number.isInteger(idx));
    if (changedArray.length) {
      this.invalidateTiles(changedArray);
      this.rebuildLighting();
    }
  }

  unlock(targetId) {
    if (!targetId || targetId === this.gate?.id || targetId === 'gate') {
      this.unlockGate();
    }
  }

  isLitAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return false;
    return this.lightTiles[ty * this.mapWidth + tx] === true;
  }

  findNearestLitPosition(x, y) {
    let best = null;
    let bestDistance = Infinity;

    for (let ty = 0; ty < this.mapHeight; ty += 1) {
      for (let tx = 0; tx < this.mapWidth; tx += 1) {
        const index = ty * this.mapWidth + tx;
        if (!this.lightTiles[index]) continue;
        const centerX = tx * TILE + TILE / 2;
        const centerY = ty * TILE + TILE / 2;
        if (isBlockingTileId(this.collisionTiles[index])) continue;
        const distance = Math.hypot(centerX - x, centerY - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: centerX, y: centerY, tx, ty };
        }
      }
    }

    return best;
  }

  getLightSwitches() {
    return this.lightSwitches;
  }

  toggleLightSwitch(id) {
    const found = this.lightSwitches.find((sw) => sw.id === id);
    if (!found) return null;
    return this.setLightSwitchState(found.id, !found.activated);
  }

  setLightSwitchState(id, active, { resetTimer = true } = {}) {
    const found = this.lightSwitches.find((sw) => sw.id === id);
    if (!found) return null;
    const nextActive = Boolean(active);
    const changed = found.activated !== nextActive;
    found.activated = nextActive;
    if (nextActive) {
      if (resetTimer && Number.isFinite(found.timerSeconds) && found.timerSeconds > 0) {
        found.timerRemaining = found.timerSeconds;
      } else if (!Number.isFinite(found.timerSeconds) || found.timerSeconds <= 0) {
        found.timerRemaining = null;
      }
    } else {
      found.timerRemaining = null;
    }
    if (changed) {
      this.rebuildLighting();
    }
    return { activated: found.activated, changed };
  }

  updateLightSwitchTimers(dt) {
    if (!this.lightSwitches.length) return false;
    let changed = false;
    this.lightSwitches.forEach((sw) => {
      if (!sw.activated) return;
      if (!Number.isFinite(sw.timerRemaining)) return;
      sw.timerRemaining = Math.max(0, sw.timerRemaining - dt);
      if (sw.timerRemaining === 0) {
        sw.activated = false;
        sw.timerRemaining = null;
        changed = true;
      }
    });
    if (changed) {
      this.rebuildLighting();
    }
    return changed;
  }

  getActorPlacements() {
    return JSON.parse(JSON.stringify(this.actorPlacements));
  }

  initializePressureSwitches() {
    if (!this.pressureSwitchConfig?.length) {
      this.pressureSwitches = [];
      return;
    }

    this.pressureSwitches = this.pressureSwitchConfig.map((plate) => {
      const targets = Array.isArray(plate.targets) ? plate.targets : [];
      return {
        ...plate,
        openTile: plate.openTile ?? FLOOR_TILE,
        closedTile: plate.closedTile ?? DOOR_TILE,
        targetIndices: targets
          .map(({ tx, ty }) => ty * this.mapWidth + tx)
          .filter((index) => Number.isInteger(index) && index >= 0 && index < this.collisionTiles.length),
        activated: false,
      };
    });

    this.pressureSwitches.forEach((plate) => {
      const tileValue = plate.closedTile ?? DOOR_TILE;
      plate.targetIndices.forEach((index) => {
        this.collisionTiles[index] = tileValue;
        this.decorTiles[index] = tileValue;
      });
    });

    const changed = new Set();
    this.pressureSwitches.forEach((plate) => {
      plate.targetIndices?.forEach((index) => changed.add(index));
    });
    if (changed.size) {
      this.rebuildTileEffects(Array.from(changed));
      this.refreshDestructibleTiles(Array.from(changed));
    }
  }

  applyPressureSwitchState(plate) {
    const tileValue = plate.activated ? plate.openTile : plate.closedTile;
    plate.targetIndices?.forEach((index) => {
      this.collisionTiles[index] = tileValue;
      this.decorTiles[index] = tileValue;
    });
    if (plate.targetIndices?.length) {
      this.invalidateTiles(plate.targetIndices);
      this.rebuildLighting();
    }
  }

  updatePressureSwitches(occupants = []) {
    if (!this.pressureSwitches.length) return false;

    let changed = false;
    const normalized = occupants.filter((entity) => entity && Number.isFinite(entity.x) && Number.isFinite(entity.y));

    this.pressureSwitches.forEach((plate) => {
      const active = normalized.some((entity) => isOccupyingTile(entity, plate.tx, plate.ty));
      if (active !== plate.activated) {
        plate.activated = active;
        this.applyPressureSwitchState(plate);
        changed = true;
      }
    });

    return changed;
  }

  getPickupTemplates() {
    return this.config.pickups ?? [];
  }

  getNpcScripts() {
    return this.config.npcScripts ?? {};
  }

  getRewards() {
    return this.config.rewards ?? {};
  }

  getQuestConfigs() {
    return this.config.quests ?? [];
  }

  getObjectiveTotal() {
    const questObjective = this.config.quests?.[0]?.objectiveCount;
    if (questObjective != null) return questObjective;
    return (this.config.pickups ?? []).filter((pickup) => pickup.objective !== false).length;
  }

  serializeLighting() {
    return {
      activatedSwitchIds: this.lightSwitches.filter((sw) => sw.activated).map((sw) => sw.id),
    };
  }

  serializeState() {
    return {
      gateUnlocked: !this.gate?.locked,
      lighting: this.serializeLighting(),
      destructibles: Array.from(this.destructibleTiles.entries()).map(([index, hp]) => ({ index, hp })),
    };
  }

  createSnapshot() {
    return this.serializeState();
  }

  restoreLighting(lightingState) {
    if (!lightingState?.activatedSwitchIds?.length) return;
    lightingState.activatedSwitchIds.forEach((id) => {
      this.setLightSwitchState(id, true);
    });
  }

  restoreDestructibleState(destructibleState) {
    if (!Array.isArray(destructibleState)) return;
    const hpByIndex = new Map();
    destructibleState.forEach((entry) => {
      const safeIndex = Number.isInteger(entry?.index) ? entry.index : null;
      if (safeIndex == null || safeIndex < 0 || safeIndex >= this.collisionTiles.length) return;
      const destructible = resolveDestructibleTile(this.collisionTiles[safeIndex], this.decorTiles[safeIndex]);
      if (!destructible) return;
      const safeHp = Math.max(1, Math.floor(entry.hp ?? getTileHitPoints(destructible.tileId)));
      hpByIndex.set(safeIndex, safeHp);
    });

    const changed = [];
    this.collisionTiles.forEach((tile, index) => {
      const destructible = resolveDestructibleTile(this.collisionTiles[index], this.decorTiles[index]);
      if (!destructible) return;
      if (!hpByIndex.has(index)) {
        const destroyedFloor = this.getDestroyedFloorTile(index);
        this.collisionTiles[index] = destroyedFloor;
        this.decorTiles[index] = destroyedFloor;
        this.destructibleTiles.delete(index);
        changed.push(index);
        return;
      }
      const nextHp = hpByIndex.get(index);
      this.destructibleTiles.set(index, nextHp);
    });

    if (changed.length) {
      this.invalidateTiles(changed);
    }
  }

  restoreState(levelState) {
    this.resetState();
    if (!levelState) return;
    if (levelState.gateUnlocked) {
      this.unlockGate();
    }
    this.restoreLighting(levelState.lighting);
    this.restoreDestructibleState(levelState.destructibles);
  }

  restoreSnapshot(levelState) {
    this.restoreState(levelState);
  }

  getDimensions() {
    return { width: this.mapWidth, height: this.mapHeight };
  }

  invalidateTiles(indices) {
    if (indices?.length) {
      this.dynamicDecorDirty = true;
    }
    indices.forEach((index) => {
      if (!Number.isInteger(index)) return;
      if (index < 0 || index >= this.decorTiles.length) return;
      this.dirtyTileIndices.add(index);
      this.refreshDestructibleTile(index);
      if (this.updateTileEffect(index)) {
        this.lightingDirtyAll = true;
      }
    });
  }

  invalidateLighting(indices) {
    indices.forEach((index) => {
      if (!Number.isInteger(index)) return;
      if (index < 0 || index >= this.lightTiles.length) return;
      this.dirtyLightingIndices.add(index);
    });
  }

  rebuildTileEffects(indices) {
    const fullRebuild = !indices || !indices.length;
    const targets = fullRebuild ? this.tileEffects.map((_, index) => index) : indices;
    let changed = false;
    let effectCount = fullRebuild ? 0 : this.tileEffectsCount;
    targets.forEach((index) => {
      if (!Number.isInteger(index)) return;
      if (index < 0 || index >= this.tileEffects.length) return;
      const updated = this.computeTileEffect(index);
      const previous = this.tileEffects[index];
      if (fullRebuild) {
        this.tileEffects[index] = updated;
        if (updated) effectCount += 1;
        if (updated !== previous) changed = true;
        return;
      }
      if (updated === previous) return;
      this.tileEffects[index] = updated;
      changed = true;
      if (previous && !updated) effectCount -= 1;
      if (!previous && updated) effectCount += 1;
    });
    this.tileEffectsCount = effectCount;
    if (changed) {
      this.lightingDirtyAll = true;
    }
  }

  updateTileEffect(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.tileEffects.length) return false;
    const updated = this.computeTileEffect(index);
    const previous = this.tileEffects[index];
    if (updated === previous) return false;
    this.tileEffects[index] = updated;
    if (previous && !updated) this.tileEffectsCount -= 1;
    if (!previous && updated) this.tileEffectsCount += 1;
    return true;
  }

  computeTileEffect(index) {
    const decorTile = this.decorTiles[index];
    const collisionTile = this.collisionTiles[index];
    const def = getTileDefinition(Number.isInteger(decorTile) ? decorTile : collisionTile);
    if (!def.lighting) return null;
    return { ...def.lighting };
  }

  rebuildDynamicDecor(spriteSheet = this.layerSpriteSheet) {
    this.dynamicDecor = [];
    this.dynamicDecorIndices = new Set();
    const decorTextures = spriteSheet?.decorTextures;
    if (!decorTextures) return;

    this.decorTiles.forEach((tile, index) => {
      const variant = getDecorVariantIndex(tile);
      const image = variant != null ? decorTextures.get(variant) : null;
      if (!image) return;
      const tx = index % this.mapWidth;
      const ty = Math.floor(index / this.mapWidth);
      this.dynamicDecorIndices.add(index);
      this.dynamicDecor.push({
        image,
        variant,
        x: tx * TILE,
        y: ty * TILE,
      });
    });
  }

  createLayerCanvas(tiles, spriteSheet, baseTiles, suppressSprites) {
    const canvas = document.createElement('canvas');
    canvas.width = this.mapWidth * TILE;
    canvas.height = this.mapHeight * TILE;
    const context = canvas.getContext('2d');
    renderTilesToContext(context, tiles, this.mapWidth, spriteSheet, null, baseTiles, suppressSprites);
    return { canvas, context };
  }

  ensureLayers(spriteSheet) {
    const spriteSheetChanged = this.layerSpriteSheet !== spriteSheet;
    if (spriteSheetChanged) {
      this.layerDirtyAll = true;
      this.dynamicDecorDirty = true;
    }
    this.layerSpriteSheet = spriteSheet;

    if (this.dynamicDecorDirty) {
      this.rebuildDynamicDecor(spriteSheet);
      this.dynamicDecorDirty = false;
    }

    if (!this.layers.decor.canvas || !this.layers.collision.canvas || this.layerDirtyAll) {
      this.layers.decor = this.createLayerCanvas(
        this.decorTiles,
        spriteSheet,
        this.collisionTiles,
        this.dynamicDecorIndices,
      );
      this.layers.collision = this.createLayerCanvas(this.collisionTiles, spriteSheet);
      this.layerDirtyAll = false;
      this.dirtyTileIndices.clear();
      return;
    }

    if (this.dirtyTileIndices.size) {
      const dirtyArray = Array.from(this.dirtyTileIndices);
      renderTilesToContext(
        this.layers.decor.context,
        this.decorTiles,
        this.mapWidth,
        spriteSheet,
        dirtyArray,
        this.collisionTiles,
        this.dynamicDecorIndices,
      );
      renderTilesToContext(this.layers.collision.context, this.collisionTiles, this.mapWidth, spriteSheet, dirtyArray);
      this.dirtyTileIndices.clear();
    }
  }

  ensureLightingLayer() {
    if (!this.lightingLayer.canvas || this.lightingDirtyAll) {
      const canvas = document.createElement('canvas');
      canvas.width = this.mapWidth * TILE;
      canvas.height = this.mapHeight * TILE;
      const context = canvas.getContext('2d');
      renderLightingToContext(
        context,
        this.lightTiles,
        this.mapWidth,
        this.mapHeight,
        this.tileEffects,
        undefined,
        this.tileEffectsCount > 0,
      );
      this.lightingLayer = { canvas, context };
      this.lightingDirtyAll = false;
      this.dirtyLightingIndices.clear();
      return;
    }

    if (this.dirtyLightingIndices.size) {
      const dirtyArray = Array.from(this.dirtyLightingIndices);
      renderLightingToContext(
        this.lightingLayer.context,
        this.lightTiles,
        this.mapWidth,
        this.mapHeight,
        this.tileEffects,
        dirtyArray,
        this.tileEffectsCount > 0,
      );
      this.dirtyLightingIndices.clear();
    }
  }
}

export function getLevelDimensions(level) {
  const dimensions = level?.getDimensions?.() ?? {};
  return {
    width: dimensions.width ?? WORLD.width,
    height: dimensions.height ?? WORLD.height,
  };
}

export function drawGrid(ctx, canvas, { width = WORLD.width, height = WORLD.height } = {}, camera = { x: 0, y: 0 }) {
  ctx.fillStyle = COLORS.gridBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;

  const startX = Math.max(0, Math.floor(camera.x / TILE));
  const startY = Math.max(0, Math.floor(camera.y / TILE));
  const endX = Math.min(width, Math.ceil((camera.x + canvas.width) / TILE));
  const endY = Math.min(height, Math.ceil((camera.y + canvas.height) / TILE));

  for (let x = startX; x <= endX; x += 1) {
    const px = x * TILE - camera.x;
    ctx.beginPath();
    ctx.moveTo(px + 0.5, 0);
    ctx.lineTo(px + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += 1) {
    const py = y * TILE - camera.y;
    ctx.beginPath();
    ctx.moveTo(0, py + 0.5);
    ctx.lineTo(canvas.width, py + 0.5);
    ctx.stroke();
  }
}

export function drawCameraBounds(ctx, { width = WORLD.width, height = WORLD.height } = {}, camera = { x: 0, y: 0 }) {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1 - camera.x, 1 - camera.y, width * TILE - 2, height * TILE - 2);
}

function drawTileBase(context, def, x, y) {
  const category = def.category ?? 'floor';
  if (category === 'wall') {
    drawWallTile(context, def, x, y);
  } else if (category === 'door') {
    drawDoorTile(context, def, x, y);
  } else {
    drawFloorTile(context, def, x, y);
  }
}

function drawTile(context, tile, x, y, spriteSheet, { overlayBase, suppressSprite } = {}) {
  const def = getTileDefinition(tile);
  const sprite = resolveSpriteForTile(def, spriteSheet);
  const baseDef =
    overlayBase != null && (def.category === 'overlay' || def.transparent)
      ? getTileDefinition(overlayBase)
      : null;
  const baseSprite = baseDef ? resolveSpriteForTile(baseDef, spriteSheet) : null;

  context.clearRect(x, y, TILE, TILE);
  context.save();

  if (baseDef) {
    drawTileBase(context, baseDef, x, y);
    if (baseSprite) baseSprite.render({ context, x, y, width: TILE, height: TILE });
  } else {
    drawTileBase(context, def, x, y);
  }

  if (sprite && !suppressSprite) {
    sprite.render({ context, x, y, width: TILE, height: TILE });
  }
  context.restore();
}

function resolveSpriteForTile(definition, spriteSheet) {
  if (!spriteSheet?.animations) return null;
  const keys = [
    definition.spriteKey,
    definition.variant,
    definition.category,
    definition.category === 'floor' ? 'floor' : null,
  ].filter(Boolean);

  for (let i = 0; i < keys.length; i += 1) {
    const animation = spriteSheet.animations[keys[i]];
    if (animation) return animation;
  }
  return null;
}

function drawWallTile(context, def, x, y) {
  const innerInset = 2;
  context.fillStyle = COLORS.wall;
  context.fillRect(x, y, TILE, TILE);
  context.fillStyle = def.transparent ? 'rgba(255, 255, 255, 0.08)' : COLORS.wallInner;
  context.fillRect(x + innerInset, y + innerInset, TILE - innerInset * 2, TILE - innerInset * 2);

  if (def.variant?.includes('window')) {
    context.fillStyle = 'rgba(110, 242, 164, 0.16)';
    context.fillRect(x + 4, y + 4, TILE - 8, TILE - 10);
    context.strokeStyle = 'rgba(110, 242, 164, 0.35)';
    context.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 9);
  }

}

function drawDoorTile(context, def, x, y) {
  context.fillStyle = COLORS.doorClosed;
  context.fillRect(x, y, TILE, TILE);
  context.strokeStyle = COLORS.doorAccent;
  context.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);

  if (def.variant?.includes('open')) {
    context.fillStyle = 'rgba(110, 242, 164, 0.14)';
    context.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
  }
}

function drawFloorTile(context, def, x, y) {
  const crackedFloor = def.variant === 'floor_broken';
  context.fillStyle = COLORS.floor;
  context.fillRect(x, y, TILE, TILE);
  context.fillStyle = COLORS.floorGlow;
  context.fillRect(x, y + TILE - 6, TILE, 6);

  if (crackedFloor) {
    context.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + 6, y + TILE / 2);
    context.lineTo(x + TILE / 2, y + TILE - 6);
    context.lineTo(x + TILE - 5, y + TILE / 2);
    context.stroke();
  }
}

function renderTilesToContext(context, tiles, width, spriteSheet, indices, baseTiles, suppressSprites) {
  if (!context) return;
  if (!indices || !indices.length) {
    for (let y = 0; y < tiles.length / width; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tile = tiles[y * width + x];
        const overlayBase = baseTiles ? baseTiles[y * width + x] : undefined;
        drawTile(context, tile, x * TILE, y * TILE, spriteSheet, {
          overlayBase,
          suppressSprite: suppressSprites?.has?.(y * width + x),
        });
      }
    }
    return;
  }

  indices.forEach((index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const tile = tiles[index];
    const overlayBase = baseTiles ? baseTiles[index] : undefined;
    drawTile(context, tile, x * TILE, y * TILE, spriteSheet, {
      overlayBase,
      suppressSprite: suppressSprites?.has?.(index),
    });
  });
}

function renderLightingToContext(context, lightTiles, width, height, tileEffects = null, indices, hasTileEffects = false) {
  if (!context) return;
  const fullRedraw = !indices || !indices.length || hasTileEffects;

  if (fullRedraw) {
    context.clearRect(0, 0, width * TILE, height * TILE);
    context.fillStyle = LIGHTING_SHADOW_COLOR;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (lightTiles[index]) continue;
        context.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    context.fillStyle = LIGHTING_TINT_COLOR;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (!lightTiles[index]) continue;
        context.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  } else {
    indices.forEach((index) => {
      if (!Number.isInteger(index) || index < 0 || index >= lightTiles.length) return;
      const x = index % width;
      const y = Math.floor(index / width);
      context.clearRect(x * TILE, y * TILE, TILE, TILE);
      context.fillStyle = lightTiles[index] ? LIGHTING_TINT_COLOR : LIGHTING_SHADOW_COLOR;
      context.fillRect(x * TILE, y * TILE, TILE, TILE);
    });
  }

  if (!tileEffects) return;

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const effect = tileEffects[index];
      if (!effect) continue;
      drawLightingEffect(context, effect, x * TILE, y * TILE);
    }
  }
  context.restore();
}

function drawLightingEffect(context, effect, x, y) {
  const color = effect.color ?? DEFAULT_LIGHT_COLOR;
  const intensity = Math.min(1, Math.max(0, effect.intensity ?? 0.6));
  context.globalAlpha = intensity;

  if (effect.mask === 'windowCone') {
    const length = (effect.length ?? 1.3) * TILE;
    const spread = (effect.spread ?? 1) * TILE;
    const offsetY = (effect.offsetY ?? 0) * TILE;
    const startX = x + TILE / 2;
    const startY = y + offsetY;
    const halfSpread = spread / 2;

    const gradient = context.createLinearGradient(startX, startY, startX, startY + length);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(startX - halfSpread, startY + length);
    context.lineTo(startX + halfSpread, startY + length);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
    context.globalAlpha = 1;
    return;
  }

  const radius = Math.max(TILE / 2, (effect.radius ?? 1.1) * TILE);
  const centerX = x + TILE / 2;
  const centerY = y + TILE / 2;
  const gradient = context.createRadialGradient(centerX, centerY, TILE * 0.2, centerX, centerY, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  context.globalAlpha = 1;
}
