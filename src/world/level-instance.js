/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 */

import { COLORS, TILE, WORLD } from '../core/constants.js';

const DOOR_TILE = 2;

export class LevelInstance {
  /**
   * @param {LevelConfig} levelConfig
   */
  constructor(levelConfig) {
    this.config = levelConfig;
    this.meta = levelConfig.meta ?? { name: 'Unknown Sector' };
    this.mapWidth = WORLD.width;
    this.mapHeight = levelConfig.map.length / this.mapWidth;

    if (!Number.isInteger(this.mapHeight)) {
      throw new Error(
        `Invalid map dimensions: expected rows of ${this.mapWidth} tiles but got ${levelConfig.map.length} entries.`,
      );
    }

    // Keep the world size in sync with the map so the renderer and editor agree.
    WORLD.height = this.mapHeight;

    this.baseTiles = [...levelConfig.map];
    this.unlockedTiles = levelConfig.unlockedMap ?? this.baseTiles;
    this.actorPlacements = levelConfig.actors ?? {};
    this.interactables = levelConfig.interactables ?? {};
    this.gateConfig = this.interactables.gate ?? null;

    this.lightingConfig = {
      ...(levelConfig.lighting ?? {}),
      switches: this.interactables.switches ?? levelConfig.lighting?.switches ?? [],
    };

    this.resetState();
  }

  resetState() {
    this.levelTiles = [...this.baseTiles];
    this.gate = this.gateConfig
      ? {
          ...this.gateConfig,
          locked: this.gateConfig.locked ?? true,
        }
      : null;
    this.gateIndex = this.gate ? this.gate.ty * WORLD.width + this.gate.tx : null;
    this.gateOpenTile = this.gate?.openTile ?? 0;
    this.sealedTiles = this.gate?.sealedTiles ?? [];
    this.sealedTileIndices = this.gateIndex === null ? [] : this.sealedTiles.map(([tx, ty]) => ty * WORLD.width + tx);
    this.sealedTileOriginals = this.gateIndex === null ? [] : this.sealedTileIndices.map((index) => this.unlockedTiles[index] ?? 0);

    this.lightTiles = new Array(WORLD.width * WORLD.height).fill(false);
    this.lightSwitches = (this.lightingConfig.switches ?? []).map((sw) => ({ ...sw, activated: false }));

    this.applyLightingZones(this.lightingConfig.litZones ?? []);

    if (this.gateIndex !== null && this.levelTiles[this.gateIndex] !== DOOR_TILE) {
      this.levelTiles[this.gateIndex] = DOOR_TILE;
    }
  }

  applyLightingZones(zones = []) {
    zones.forEach((zone) => {
      const startX = Math.max(0, zone.x);
      const startY = Math.max(0, zone.y);
      const endX = Math.min(WORLD.width, zone.x + zone.w);
      const endY = Math.min(WORLD.height, zone.y + zone.h);

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          this.lightTiles[y * WORLD.width + x] = true;
        }
      }
    });
  }

  tileAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) {
      return 1;
    }
    return this.levelTiles[ty * WORLD.width + tx];
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

    for (let y = 0; y < WORLD.height; y++) {
      for (let x = 0; x < WORLD.width; x++) {
        const tile = this.levelTiles[y * WORLD.width + x];
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

  drawLighting(ctx, camera) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 14, 0.78)';
    for (let y = 0; y < WORLD.height; y += 1) {
      for (let x = 0; x < WORLD.width; x += 1) {
        const lit = this.lightTiles[y * WORLD.width + x];
        if (lit) continue;
        const screenX = x * TILE - camera.x;
        const screenY = y * TILE - camera.y;
        ctx.fillRect(screenX, screenY, TILE, TILE);
      }
    }
    ctx.restore();
  }

  clampCamera(camera, player, canvas) {
    camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD.width * TILE - canvas.width));
    camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD.height * TILE - canvas.height));
  }

  getGateState() {
    if (!this.gate) return null;
    return { ...this.gate, x: this.gate.tx * TILE + TILE / 2, y: this.gate.ty * TILE + TILE / 2 };
  }

  unlockGate() {
    if (!this.gate || !this.gate.locked) return;
    this.gate.locked = false;
    if (this.gateIndex !== null) {
      this.levelTiles[this.gateIndex] = this.gateOpenTile;
    }
    this.sealedTileIndices.forEach((index, i) => {
      this.levelTiles[index] = this.sealedTileOriginals[i] ?? 0;
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
    if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) return false;
    return this.lightTiles[ty * WORLD.width + tx] === true;
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
}

export function drawGrid(ctx, canvas) {
  ctx.fillStyle = COLORS.gridBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }
}
