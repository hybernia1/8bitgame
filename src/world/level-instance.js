/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 * @typedef {import('../data/types.js').TileLayers} TileLayers
 */

import { COLORS, TILE, WORLD } from '../core/constants.js';

const DOOR_TILE = 2;

function isOccupyingTile(entity, tx, ty) {
  if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') return false;
  const size = entity.size ?? entity.width ?? TILE;
  const halfEntity = size / 2;
  const halfTile = TILE / 2;
  const cx = tx * TILE + halfTile;
  const cy = ty * TILE + halfTile;
  return Math.abs(entity.x - cx) < halfTile + halfEntity && Math.abs(entity.y - cy) < halfTile + halfEntity;
}

function resolveTileLayers(config) {
  const layers = config.tileLayers ?? {};
  const fallback = config.map ?? [];
  const fallbackUnlocked = config.unlockedMap ?? fallback;
  const collision = layers.collision ?? fallback;
  const decor = layers.decor ?? collision;
  return {
    collision: [...collision],
    decor: [...decor],
    collisionUnlocked: [...(layers.collisionUnlocked ?? fallbackUnlocked ?? collision)],
    decorUnlocked: [...(layers.decorUnlocked ?? decor ?? fallbackUnlocked)],
  };
}

export class LevelInstance {
  /**
   * @param {LevelConfig} levelConfig
   */
  constructor(levelConfig) {
    this.config = levelConfig;
    this.meta = levelConfig.meta ?? { name: 'Unknown Sector' };
    this.mapWidth = levelConfig.width ?? WORLD.width;

    const tileLayers = resolveTileLayers(levelConfig);
    const collisionHeight = tileLayers.collision.length / this.mapWidth;

    if (!Number.isInteger(collisionHeight)) {
      throw new Error(
        `Invalid map dimensions: expected rows of ${this.mapWidth} tiles but got ${tileLayers.collision.length} entries.`,
      );
    }

    this.mapHeight = levelConfig.height ?? collisionHeight;

    if (!Number.isInteger(this.mapHeight)) {
      throw new Error(`Invalid map height: "${this.mapHeight}" is not an integer.`);
    }

    this.collisionBase = tileLayers.collision;
    this.collisionUnlocked = tileLayers.collisionUnlocked;
    this.decorBase = tileLayers.decor;
    this.decorUnlocked = tileLayers.decorUnlocked;

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
    if (this.collisionUnlocked.length !== expectedSize) {
      throw new Error(
        `Unlocked collision layer size mismatch: expected ${expectedSize} tiles but received ${this.collisionUnlocked.length}.`,
      );
    }
    if (this.decorUnlocked.length !== expectedSize) {
      throw new Error(
        `Unlocked decor layer size mismatch: expected ${expectedSize} tiles but received ${this.decorUnlocked.length}.`,
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
    this.gate = this.gateConfig
      ? {
          ...this.gateConfig,
          locked: this.gateConfig.locked ?? true,
        }
      : null;
    this.gateIndex = this.gate ? this.gate.ty * this.mapWidth + this.gate.tx : null;
    this.gateOpenTile = this.gate?.openTile ?? 0;
    this.sealedTiles = this.gate?.sealedTiles ?? [];
    this.sealedTileIndices = this.gateIndex === null ? [] : this.sealedTiles.map(([tx, ty]) => ty * this.mapWidth + tx);
    this.sealedCollisionOriginals =
      this.gateIndex === null ? [] : this.sealedTileIndices.map((index) => this.collisionUnlocked[index] ?? 0);
    this.sealedDecorOriginals =
      this.gateIndex === null ? [] : this.sealedTileIndices.map((index) => this.decorUnlocked[index] ?? 0);

    this.lightTiles = new Array(this.mapWidth * this.mapHeight).fill(false);
    this.lightSwitches = (this.lightingConfig.switches ?? []).map((sw) => ({ ...sw, activated: false }));
    this.pressureSwitches = [];

    this.applyLightingZones(this.lightingConfig.litZones ?? []);

    if (this.gateIndex !== null) {
      if (this.collisionTiles[this.gateIndex] !== DOOR_TILE) {
        this.collisionTiles[this.gateIndex] = DOOR_TILE;
      }
      if (this.decorTiles[this.gateIndex] !== DOOR_TILE) {
        this.decorTiles[this.gateIndex] = DOOR_TILE;
      }
    }

    this.initializePressureSwitches();
  }

  applyLightingZones(zones = []) {
    zones.forEach((zone) => {
      const startX = Math.max(0, zone.x);
      const startY = Math.max(0, zone.y);
      const endX = Math.min(this.mapWidth, zone.x + zone.w);
      const endY = Math.min(this.mapHeight, zone.y + zone.h);

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          this.lightTiles[y * this.mapWidth + x] = true;
        }
      }
    });
  }

  tileAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) {
      return 1;
    }
    return this.collisionTiles[ty * this.mapWidth + tx];
  }

  canMove(size, nx, ny) {
    const half = size / 2;
    const corners = [
      [nx - half, ny - half],
      [nx + half, ny - half],
      [nx - half, ny + half],
      [nx + half, ny + half],
    ];
    return corners.every(([x, y]) => this.tileAt(x, y) === 0);
  }

  drawLevel(ctx, camera, spriteSheet) {
    const useSprites = Boolean(spriteSheet);
    const floorSprite = spriteSheet?.animations?.floor;
    const wallSprite = spriteSheet?.animations?.wall;
    const doorSprite = spriteSheet?.animations?.door;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.decorTiles[y * this.mapWidth + x];
        const screenX = x * TILE - camera.x;
        const screenY = y * TILE - camera.y;
        if (tile === 1) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(screenX, screenY, TILE, TILE);
          ctx.fillStyle = COLORS.wallInner;
          ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);

          if (wallSprite && useSprites) {
            wallSprite.render({ context: ctx, x: screenX, y: screenY, width: TILE, height: TILE });
          }
        } else if (tile === DOOR_TILE) {
          ctx.fillStyle = COLORS.doorClosed;
          ctx.fillRect(screenX, screenY, TILE, TILE);
          ctx.strokeStyle = COLORS.doorAccent;
          ctx.strokeRect(screenX + 4, screenY + 4, TILE - 8, TILE - 8);

          if (doorSprite && useSprites) {
            doorSprite.render({ context: ctx, x: screenX, y: screenY, width: TILE, height: TILE });
          }
        } else {
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(screenX, screenY, TILE, TILE);
          ctx.fillStyle = COLORS.floorGlow;
          ctx.fillRect(screenX, screenY + TILE - 6, TILE, 6);

          if (floorSprite && useSprites) {
            floorSprite.render({ context: ctx, x: screenX, y: screenY, width: TILE, height: TILE });
          }
        }
      }
    }
  }

  drawLightSwitches(ctx, camera) {
    ctx.save();
    this.lightSwitches.forEach((sw) => {
      const x = sw.tx * TILE - camera.x;
      const y = sw.ty * TILE - camera.y;
      ctx.fillStyle = sw.activated ? '#6ef2a4' : '#f2d45c';
      ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 5, 10, 10);
      ctx.strokeStyle = sw.activated ? '#1d5c3b' : '#7a5a1d';
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
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 14, 0.78)';
    for (let y = 0; y < this.mapHeight; y += 1) {
      for (let x = 0; x < this.mapWidth; x += 1) {
        const lit = this.lightTiles[y * this.mapWidth + x];
        if (lit) continue;
        const screenX = x * TILE - camera.x;
        const screenY = y * TILE - camera.y;
        ctx.fillRect(screenX, screenY, TILE, TILE);
      }
    }
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
    if (this.gateIndex !== null) {
      this.collisionTiles[this.gateIndex] = this.gateOpenTile;
      this.decorTiles[this.gateIndex] = this.gateOpenTile;
    }
    this.sealedTileIndices.forEach((index, i) => {
      this.collisionTiles[index] = this.sealedCollisionOriginals[i] ?? 0;
      this.decorTiles[index] = this.sealedDecorOriginals[i] ?? 0;
    });
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

  getLightSwitches() {
    return this.lightSwitches;
  }

  activateLightSwitch(id) {
    const found = this.lightSwitches.find((sw) => sw.id === id);
    if (!found || found.activated) return false;
    found.activated = true;
    this.applyLightingZones(found.lights);
    return true;
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
        openTile: plate.openTile ?? 0,
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
  }

  applyPressureSwitchState(plate) {
    const tileValue = plate.activated ? plate.openTile : plate.closedTile;
    plate.targetIndices?.forEach((index) => {
      this.collisionTiles[index] = tileValue;
      this.decorTiles[index] = tileValue;
    });
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
    };
  }

  restoreLighting(lightingState) {
    if (!lightingState?.activatedSwitchIds?.length) return;
    lightingState.activatedSwitchIds.forEach((id) => {
      this.activateLightSwitch(id);
    });
  }

  restoreState(levelState) {
    this.resetState();
    if (!levelState) return;
    if (levelState.gateUnlocked) {
      this.unlockGate();
    }
    this.restoreLighting(levelState.lighting);
  }

  getDimensions() {
    return { width: this.mapWidth, height: this.mapHeight };
  }
}

export function drawGrid(ctx, canvas, { width = WORLD.width, height = WORLD.height } = {}) {
  ctx.fillStyle = COLORS.gridBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width * TILE; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= height * TILE; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }
}
