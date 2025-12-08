import { TILE, COLORS } from './constants.js';

function createTexture(scene, key, drawFn) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(g);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function drawFloor(g) {
  g.fillStyle(COLORS.floor, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(COLORS.floorGlow, 1);
  g.fillRect(0, TILE - 6, TILE, 6);
  g.fillStyle('rgba(92, 242, 204, 0.15)', 1);
  g.fillRect(4, 4, TILE - 8, 6);
}

function drawWall(g) {
  g.fillStyle(COLORS.wall, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(COLORS.wallInner, 1);
  g.fillRect(2, 2, TILE - 4, TILE - 4);
  g.fillStyle('#0c0c15', 1);
  g.fillRect(5, 5, TILE - 10, TILE - 10);
}

function drawPlayer(g) {
  g.fillStyle(COLORS.gridBorder, 1);
  g.fillRect(4, 4, TILE - 8, TILE - 8);
  g.fillStyle('#5cf2cc', 1);
  g.fillRect(6, 6, TILE - 12, TILE - 12);
  g.fillStyle('#183e35', 1);
  g.fillRect(6, TILE - 10, TILE - 12, 6);
}

function drawPickup(g) {
  g.fillStyle('rgba(0, 0, 0, 0.6)', 1);
  g.fillRect(8, TILE - 10, TILE - 16, 8);
  g.fillStyle('#f2d45c', 1);
  g.beginPath();
  g.moveTo(TILE / 2, 4);
  g.lineTo(TILE - 6, TILE / 2);
  g.lineTo(TILE / 2, TILE - 6);
  g.lineTo(6, TILE / 2);
  g.closePath();
  g.fillPath();
}

function drawNpc(g) {
  g.fillStyle('#87b0ff', 1);
  g.fillRect(6, 8, TILE - 12, TILE - 14);
  g.fillStyle('#2b2f48', 1);
  g.fillRect(6, TILE - 10, TILE - 12, 8);
  g.fillStyle('#1c2640', 1);
  g.fillRect(10, 6, TILE - 20, 4);
  g.fillStyle('#c1dbff', 1);
  g.fillRect(10, 12, TILE - 20, 6);
  g.fillStyle('#151824', 1);
  g.fillRect(12, TILE - 6, TILE / 2 - 8, 4);
  g.fillRect(TILE / 2 + 4, TILE - 6, TILE / 2 - 8, 4);
}

export function registerGeneratedTextures(scene) {
  createTexture(scene, 'floor', drawFloor);
  createTexture(scene, 'wall', drawWall);
  createTexture(scene, 'player', drawPlayer);
  createTexture(scene, 'pickup', drawPickup);
  createTexture(scene, 'npc', drawNpc);
}

export const SPRITE_KEYS = {
  floor: 'floor',
  wall: 'wall',
  player: 'player',
  pickup: 'pickup',
  npc: 'npc',
};
