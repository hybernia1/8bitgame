import { COLORS, TILE, WORLD } from '../core/constants.js';
import { demoLevel } from '../data/demoLevel.js';

const DOOR_TILE = 2;
const gate = {
  tx: 14,
  ty: 10,
  locked: true,
};

const sealedTiles = [
  [14, 9],
  [15, 9],
  [16, 9],
  [15, 10],
  [16, 10],
  [17, 10],
  [15, 11],
  [16, 11],
  [17, 11],
  [15, 12],
  [16, 12],
  [17, 12],
];

// Preserve the raw map for tooling such as the editor so we can return tiles to
// their intended values after temporarily locking areas during the tutorial.
const baseTiles = [...demoLevel.map];
const levelTiles = [...baseTiles];
const gateIndex = gate.ty * WORLD.width + gate.tx;
const gateOpenTile = 0;
const sealedTileIndices = sealedTiles.map(([tx, ty]) => ty * WORLD.width + tx);
const sealedTileOriginals = sealedTileIndices.map((index) => baseTiles[index]);

levelTiles[gateIndex] = DOOR_TILE;
sealedTileIndices.forEach((index) => {
  levelTiles[index] = 1;
});

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
  const useSprites = Boolean(spriteSheet?.animations?.floor && spriteSheet?.animations?.wall);
  const floorSprite = spriteSheet?.animations?.floor;
  const wallSprite = spriteSheet?.animations?.wall;
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
  return demoLevel.name;
}

export function getPickupTemplates() {
  return demoLevel.pickups;
}

export function getActorPlacements() {
  return demoLevel.actors;
}

export function getGateState() {
  return { ...gate, x: gate.tx * TILE + TILE / 2, y: gate.ty * TILE + TILE / 2 };
}

export function unlockGateToNewMap() {
  if (!gate.locked) return;
  gate.locked = false;
  levelTiles[gateIndex] = gateOpenTile;
  sealedTileIndices.forEach((index, i) => {
    levelTiles[index] = sealedTileOriginals[i] ?? 0;
  });
}
