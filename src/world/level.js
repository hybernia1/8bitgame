import { COLORS, TILE, WORLD } from '../core/constants.js';
import { demoLevel } from '../data/demoLevel.js';

const level = demoLevel.map;

export function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) {
    return 1;
  }
  return level[ty * WORLD.width + tx];
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
}

export function drawLevel(ctx, camera) {
  for (let y = 0; y < WORLD.height; y++) {
    for (let x = 0; x < WORLD.width; x++) {
      const tile = level[y * WORLD.width + x];
      const screenX = x * TILE - camera.x;
      const screenY = y * TILE - camera.y;
      if (tile === 1) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(screenX, screenY, TILE, TILE);
        ctx.fillStyle = COLORS.wallInner;
        ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);
      } else {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(screenX, screenY, TILE, TILE);
        ctx.fillStyle = COLORS.floorGlow;
        ctx.fillRect(screenX, screenY + TILE - 6, TILE, 6);
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
