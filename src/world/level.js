/**
 * @typedef {import('../data/types.js').LevelConfig} LevelConfig
 */

import { COLORS, TILE, WORLD } from '../core/constants.js';
import { demoLevel } from '../data/demoLevel.js';

const DOOR_TILE = 2;

/** @type {LevelConfig} */
const levelConfig = demoLevel;

const MAP_WIDTH = WORLD.width;
const MAP_HEIGHT = levelConfig.map.length / MAP_WIDTH;

if (!Number.isInteger(MAP_HEIGHT)) {
  throw new Error(
    `Invalid map dimensions: expected rows of ${MAP_WIDTH} tiles but got ${levelConfig.map.length} entries.`,
  );
}

// Keep the world size in sync with the map so the renderer and editor agree.
WORLD.height = MAP_HEIGHT;

const interactables = levelConfig.interactables ?? {};
const gate = interactables.gate ?? {
  tx: 14,
  ty: 10,
  locked: true,
  openTile: 0,
  sealedTiles: [],
};
const sealedTiles = gate.sealedTiles ?? [];

// Preserve the raw map for tooling such as the editor so we can return tiles to
// their intended values after temporarily locking areas during the tutorial.
const actorPlacements = levelConfig.actors ?? {};
const baseTiles = [...levelConfig.map];
const unlockedTiles = levelConfig.unlockedMap ?? baseTiles;
const levelTiles = [...baseTiles];
const gateIndex = gate ? gate.ty * WORLD.width + gate.tx : null;
const gateOpenTile = gate?.openTile ?? 0;
const sealedTileIndices = gateIndex === null ? [] : sealedTiles.map(([tx, ty]) => ty * WORLD.width + tx);
const sealedTileOriginals = gateIndex === null ? [] : sealedTileIndices.map((index) => unlockedTiles[index] ?? 0);

const lightingConfig = {
  ...(levelConfig.lighting ?? {}),
  switches: interactables.switches ?? levelConfig.lighting?.switches ?? [],
};
const lightTiles = new Array(WORLD.width * WORLD.height).fill(false);
const lightSwitches = (lightingConfig.switches ?? []).map((sw) => ({ ...sw, activated: false }));

function applyLightingZones(zones = []) {
  zones.forEach((zone) => {
    const startX = Math.max(0, zone.x);
    const startY = Math.max(0, zone.y);
    const endX = Math.min(WORLD.width, zone.x + zone.w);
    const endY = Math.min(WORLD.height, zone.y + zone.h);

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        lightTiles[y * WORLD.width + x] = true;
      }
    }
  });
}

applyLightingZones(lightingConfig.litZones ?? []);

if (gateIndex !== null && levelTiles[gateIndex] !== DOOR_TILE) {
  levelTiles[gateIndex] = DOOR_TILE;
}

export function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) {
    return 1;
  }
  return levelTiles[ty * WORLD.width + tx];
}

export function canMove(size, nx, ny) {
  const half = size / 2;
  const corners = [
    [nx - half, ny - half],
    [nx + half, ny - half],
    [nx - half, ny + half],
    [nx + half, ny + half],
  ];
  return corners.every(([x, y]) => tileAt(x, y) === 0);
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

export function drawLevel(ctx, camera, spriteSheet) {
  const useSprites = Boolean(spriteSheet);
  const floorSprite = spriteSheet?.animations?.floor;
  const wallSprite = spriteSheet?.animations?.wall;
  const doorSprite = spriteSheet?.animations?.door;
  for (let y = 0; y < WORLD.height; y++) {
    for (let x = 0; x < WORLD.width; x++) {
      const tile = levelTiles[y * WORLD.width + x];
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

export function clampCamera(camera, player, canvas) {
  camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD.width * TILE - canvas.width));
  camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD.height * TILE - canvas.height));
}

export function getLevelName() {
  return levelConfig.meta?.name ?? 'Unknown Sector';
}

export function getLevelMeta() {
  return levelConfig.meta ?? { name: getLevelName() };
}

export function getPickupTemplates() {
  return levelConfig.pickups;
}

export function getActorPlacements() {
  // Return a defensive copy so entity initialisation cannot accidentally wipe
  // the source data (which previously caused the demo NPCs to disappear after
  // hot reloads).
  return JSON.parse(JSON.stringify(actorPlacements));
}

export function getGateState() {
  if (!gate) return null;
  return { ...gate, x: gate.tx * TILE + TILE / 2, y: gate.ty * TILE + TILE / 2 };
}

export function unlockGateToNewMap() {
  if (!gate || !gate.locked) return;
  gate.locked = false;
  if (gateIndex !== null) {
    levelTiles[gateIndex] = gateOpenTile;
  }
  sealedTileIndices.forEach((index, i) => {
    levelTiles[index] = sealedTileOriginals[i] ?? 0;
  });
}

export function isLitAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) return false;
  return lightTiles[ty * WORLD.width + tx] === true;
}

export function getLightSwitches() {
  return lightSwitches;
}

export function activateLightSwitch(id) {
  const found = lightSwitches.find((sw) => sw.id === id);
  if (!found || found.activated) return false;
  found.activated = true;
  applyLightingZones(found.lights);
  return true;
}

export function drawLightSwitches(ctx, camera) {
  ctx.save();
  lightSwitches.forEach((sw) => {
    const x = sw.tx * TILE - camera.x;
    const y = sw.ty * TILE - camera.y;
    ctx.fillStyle = sw.activated ? '#6ef2a4' : '#f2d45c';
    ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 5, 10, 10);
    ctx.strokeStyle = sw.activated ? '#1d5c3b' : '#7a5a1d';
    ctx.strokeRect(x + TILE / 2 - 6, y + TILE / 2 - 6, 12, 12);
  });
  ctx.restore();
}

export function getNpcScripts() {
  return levelConfig.npcScripts ?? {};
}

export function getRewards() {
  return levelConfig.rewards ?? {};
}

export function getQuestConfigs() {
  return levelConfig.quests ?? [];
}

export function getObjectiveTotal() {
  const questObjective = levelConfig.quests?.[0]?.objectiveCount;
  if (questObjective != null) return questObjective;
  return (levelConfig.pickups ?? []).filter((pickup) => pickup.objective !== false).length;
}

export function drawLighting(ctx, camera) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 14, 0.78)';
  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const lit = lightTiles[y * WORLD.width + x];
      if (lit) continue;
      const screenX = x * TILE - camera.x;
      const screenY = y * TILE - camera.y;
      ctx.fillRect(screenX, screenY, TILE, TILE);
    }
  }
  ctx.restore();
}
