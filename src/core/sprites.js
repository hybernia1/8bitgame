import { SpriteSheet } from '../kontra.mjs';
import { TILE, COLORS } from './constants.js';

const SPRITE_ORDER = ['floor', 'wall', 'player', 'pickup', 'npc', 'monster', 'prop'];
const TEXTURE_SEED = 1337;

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

function createRng(seed = TEXTURE_SEED) {
  let state = seed;

  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterColor(hex, amount, random) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((chunk) => parseInt(chunk, 16));

  const clamp = (value) => Math.max(0, Math.min(255, value));

  const toHex = (value) => value.toString(16).padStart(2, '0');

  const jittered = [r, g, b].map((channel) =>
    clamp(channel + Math.round((random() - 0.5) * amount)),
  );

  return `#${jittered.map(toHex).join('')}`;
}

function drawNoise(ctx, x, y, width, height, baseColor, accentColor, density, random) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = accentColor;
  const count = Math.floor(width * height * density);

  for (let i = 0; i < count; i += 1) {
    const px = x + Math.floor(random() * width);
    const py = y + Math.floor(random() * height);
    ctx.fillRect(px, py, 1, 1);
  }
}

async function canvasToImage(canvas) {
  const image = new Image();
  const loadPromise = new Promise((resolve) => {
    image.onload = resolve;
  });
  image.src = canvas.toDataURL('image/png');
  await loadPromise;
  return image;
}

function withTexture(drawFn) {
  const random = createRng();
  return (ctx) => drawFn(ctx, random);
}

function drawFloor(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.floor, '#0d2d27', 0.03, random);
  ctx.fillStyle = COLORS.floorGlow;
  ctx.fillRect(0, TILE - 6, TILE, 6);
  ctx.fillStyle = 'rgba(92, 242, 204, 0.15)';
  ctx.fillRect(4, 4, TILE - 8, 6);
  ctx.strokeStyle = 'rgba(92, 242, 204, 0.2)';
  ctx.strokeRect(1, 1, TILE - 2, TILE - 2);
}

function drawWall(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.wall, '#0c0c15', 0.02, random);
  ctx.fillStyle = jitterColor(COLORS.wallInner, 14, random);
  ctx.fillRect(2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#0c0c15';
  ctx.fillRect(5, 5, TILE - 10, TILE - 10);
  ctx.strokeStyle = 'rgba(140, 152, 199, 0.35)';
  ctx.strokeRect(5.5, 5.5, TILE - 11, TILE - 11);
}

function drawPlayer(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0e1f1a', '#17342b', 0.04, random);
  ctx.fillStyle = COLORS.gridBorder;
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.fillStyle = jitterColor('#5cf2cc', 24, random);
  ctx.fillRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(6, TILE - 10, TILE - 12, 6);
  ctx.strokeStyle = 'rgba(9, 14, 12, 0.5)';
  ctx.strokeRect(3.5, 3.5, TILE - 7, TILE - 7);
}

function drawPickup(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#0e0e12', '#131925', 0.03, random);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, TILE - 10, TILE - 16, 8);
  ctx.fillStyle = jitterColor('#f2d45c', 20, random);
  ctx.beginPath();
  ctx.moveTo(TILE / 2, 4);
  ctx.lineTo(TILE - 6, TILE / 2);
  ctx.lineTo(TILE / 2, TILE - 6);
  ctx.lineTo(6, TILE / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 24, 5, 0.7)';
  ctx.stroke();
}

function drawNpc(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#161a2b', '#0d0f18', 0.03, random);
  ctx.fillStyle = jitterColor('#87b0ff', 24, random);
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.strokeRect(5.5, 7.5, TILE - 11, TILE - 13);
}

function drawMonster(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#220910', '#1a060b', 0.04, random);
  ctx.fillStyle = jitterColor('#f05b78', 26, random);
  ctx.fillRect(4, 6, TILE - 8, TILE - 12);
  ctx.fillStyle = '#2c0d16';
  ctx.fillRect(4, TILE - 10, TILE - 8, 6);
  ctx.fillStyle = '#ffd0df';
  ctx.fillRect(10, 10, 6, 6);
  ctx.fillRect(TILE - 16, 10, 6, 6);
  ctx.fillStyle = '#12060b';
  ctx.fillRect(10, 18, 6, 4);
  ctx.fillRect(TILE - 16, 18, 6, 4);
  ctx.strokeStyle = 'rgba(240, 91, 120, 0.35)';
  ctx.strokeRect(3.5, 5.5, TILE - 7, TILE - 11);
}

function drawProp(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, '#2b2924', '#1d1c18', 0.03, random);
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeRect(3.5, 3.5, TILE - 7, TILE - 7);
}

export async function loadSpriteSheet() {
  const frames = [
    withTexture(drawFloor),
    withTexture(drawWall),
    withTexture(drawPlayer),
    withTexture(drawPickup),
    withTexture(drawNpc),
    withTexture(drawMonster),
    withTexture(drawProp),
  ];
  const image = await canvasToImage(makeCanvas(frames));

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
