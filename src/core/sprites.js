import { SpriteSheet } from '../kontra.mjs';
import { TILE, COLORS } from './constants.js';

const SPRITE_ORDER = ['floor', 'wall', 'player', 'pickup', 'npc', 'monster', 'prop'];
const CUSTOM_SPRITE_SHEET = 'assets/spritesheet.png';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function makeCanvas(frames) {
  const cols = 4;
  const rows = Math.ceil(frames.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE;
  canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d');

  frames.forEach((drawFn, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    ctx.save();
    ctx.translate(col * TILE, row * TILE);
    drawFn(ctx);
    ctx.restore();
  });

  return canvas;
}

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = COLORS.floorGlow;
  ctx.fillRect(0, TILE - 6, TILE, 6);
  ctx.fillStyle = 'rgba(92, 242, 204, 0.15)';
  ctx.fillRect(4, 4, TILE - 8, 6);
}

function drawWall(ctx) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = COLORS.wallInner;
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#0c0c15';
  ctx.fillRect(5, 5, TILE - 10, TILE - 10);
}

function drawPlayer(ctx) {
  ctx.fillStyle = COLORS.gridBorder;
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.fillStyle = '#5cf2cc';
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(6, TILE - 10, TILE - 12, 6);
}

function drawPickup(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, TILE - 10, TILE - 16, 8);
  ctx.fillStyle = '#f2d45c';
  ctx.beginPath();
  ctx.moveTo(TILE / 2, 4);
  ctx.lineTo(TILE - 6, TILE / 2);
  ctx.lineTo(TILE / 2, TILE - 6);
  ctx.lineTo(6, TILE / 2);
  ctx.closePath();
  ctx.fill();
}

function drawNpc(ctx) {
  ctx.fillStyle = '#87b0ff';
  ctx.fillRect(6, 8, TILE - 12, TILE - 14);
  ctx.fillStyle = '#2b2f48';
  ctx.fillRect(6, TILE - 10, TILE - 12, 8);
  ctx.fillStyle = '#1c2640';
  ctx.fillRect(10, 6, TILE - 20, 4);
  ctx.fillStyle = '#c1dbff';
  ctx.fillRect(10, 12, TILE - 20, 6);
  ctx.fillStyle = '#151824';
  ctx.fillRect(12, TILE - 6, TILE / 2 - 8, 4);
  ctx.fillRect(TILE / 2 + 4, TILE - 6, TILE / 2 - 8, 4);
}

function drawMonster(ctx) {
  ctx.fillStyle = '#f05b78';
  ctx.fillRect(4, 6, TILE - 8, TILE - 12);
  ctx.fillStyle = '#2c0d16';
  ctx.fillRect(4, TILE - 10, TILE - 8, 6);
  ctx.fillStyle = '#ffd0df';
  ctx.fillRect(10, 10, 6, 6);
  ctx.fillRect(TILE - 16, 10, 6, 6);
  ctx.fillStyle = '#12060b';
  ctx.fillRect(10, 18, 6, 4);
  ctx.fillRect(TILE - 16, 18, 6, 4);
}

function drawProp(ctx) {
  ctx.fillStyle = '#6f6a5c';
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = '#3a362c';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, TILE - 12, TILE - 12);
  ctx.strokeStyle = '#c8c2af';
  ctx.beginPath();
  ctx.moveTo(6, 12);
  ctx.lineTo(TILE - 6, 12);
  ctx.moveTo(6, TILE - 12);
  ctx.lineTo(TILE - 6, TILE - 12);
  ctx.stroke();
}

export async function loadSpriteSheet() {
  const frames = [drawFloor, drawWall, drawPlayer, drawPickup, drawNpc, drawMonster, drawProp];
  const generatedCanvas = makeCanvas(frames);
  let image = generatedCanvas;

  try {
    image = await loadImage(CUSTOM_SPRITE_SHEET);
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error(`Sprite sheet ${CUSTOM_SPRITE_SHEET} is empty.`);
    }
    // eslint-disable-next-line no-console
    console.info(`Loaded external sprite sheet from ${CUSTOM_SPRITE_SHEET}.`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `Could not load ${CUSTOM_SPRITE_SHEET}; falling back to built-in generator.`,
      error,
    );
    image = generatedCanvas;
  }

  return SpriteSheet({
    image,
    frame: { width: TILE, height: TILE, margin: 0 },
    animations: SPRITE_ORDER.reduce((animations, name, index) => {
      animations[name] = { frames: [index] };
      return animations;
    }, {}),
  });
}

export const SPRITE_NAMES = {
  floor: 'floor',
  wall: 'wall',
  player: 'player',
  pickup: 'pickup',
  npc: 'npc',
  monster: 'monster',
  prop: 'prop',
};
