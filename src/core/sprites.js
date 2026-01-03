import { SpriteSheet } from '../kontra.mjs';
import { TILE, COLORS } from './constants.js';

const SPRITE_ORDER = ['floor', 'wall', 'door', 'player', 'pickup', 'npc', 'monster', 'prop'];
const TEXTURE_SEED = 1337;
const TEXTURE_PATHS = {
  // Prefer the documented subfolder locations, but also try a flattened path
  // (e.g., assets/hero.png) to match common host uploads where the extra
  // subdirectory is omitted.
  floor: ['assets/tiles/floor.png', 'assets/floor.png', 'floor.png'],
  wall: ['assets/walls/wall.png', 'assets/wall.png', 'wall.png'],
  door: ['assets/doors/door.png', 'assets/door.png', 'door.png'],
  player: ['assets/hero/hero.png', 'assets/hero.png', 'hero.png'],
  pickup: ['assets/items/pickup.png', 'assets/pickup.png', 'pickup.png'],
  npc: ['assets/npc/npc.png', 'assets/npcs/npc.png', 'assets/npc.png', 'npc.png'],
  monster: ['assets/npc/monster.png', 'assets/npcs/monster.png', 'assets/monsters/monster.png', 'assets/monster.png', 'monster.png'],
  prop: ['assets/props/prop.png', 'assets/prop.png', 'prop.png'],
};

const SPRITE_ANIMATIONS = {
  player: [
    { name: 'playerWalk', frames: '0..3', frameRate: 8 },
    { name: 'playerIdle', frames: [4] },
    // Keep a legacy single-frame animation for compatibility with existing lookups
    { name: 'player', frames: [0] },
  ],
};

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

function resolveTexturePath(path) {
  // Respect the page base URL so assets also resolve when the game is hosted on
  // a subpath (e.g., GitHub Pages). Fall back to the module URL for local
  // module loaders and bundlers.
  if (typeof document !== 'undefined' && document.baseURI) {
    return new URL(path, document.baseURI).href;
  }

  return new URL(`../../${path}`, import.meta.url).href;
}

function loadTextureImage(path) {
  if (!path) return Promise.resolve(null);

  const resolvedPath = resolveTexturePath(path);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = resolvedPath;
  });
}

async function loadTextureMap() {
  const entries = await Promise.all(
    Object.entries(TEXTURE_PATHS).map(async ([name, paths]) => {
      const candidates = (Array.isArray(paths) ? paths : [paths]).reduce(
        (expanded, candidate) => {
          if (!candidate) return expanded;

          expanded.push(candidate);

          // Some tools export textures with an uppercase extension (e.g.,
          // `hero.PNG`). Try both versions so drop-in assets load on
          // case-sensitive hosts as well.
          const pngIndex = candidate.toLowerCase().lastIndexOf('.png');
          if (pngIndex !== -1) {
            const upperVariant = `${candidate.slice(0, pngIndex)}.PNG`;
            if (!expanded.includes(upperVariant)) {
              expanded.push(upperVariant);
            }
          }

          return expanded;
        },
        [],
      );
      const image = await candidates.reduce(async (foundPromise, candidate) => {
        const found = await foundPromise;
        if (found) return found;
        return loadTextureImage(candidate);
      }, Promise.resolve(null));

      return [name, image];
    }),
  );

  return entries.reduce((textures, [name, image]) => {
    if (image) textures[name] = image;
    return textures;
  }, {});
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

function withTexture(drawFn, seed = TEXTURE_SEED) {
  const random = createRng(seed);
  return (ctx) => drawFn(ctx, random);
}

function drawFromImage(image) {
  return (ctx) => ctx.drawImage(image, 0, 0, TILE, TILE);
}

function drawFromImageFrame(image, sx, sy) {
  return (ctx) => ctx.drawImage(image, sx, sy, TILE, TILE, 0, 0, TILE, TILE);
}

function buildSpriteFrames(name, texture) {
  if (!texture) {
    if (name === 'player') {
      const seeds = [TEXTURE_SEED, TEXTURE_SEED + 1, TEXTURE_SEED + 2, TEXTURE_SEED + 3, TEXTURE_SEED + 4];
      return seeds.map((seed) => withTexture(DRAWERS[name], seed));
    }
    return [withTexture(DRAWERS[name])];
  }

  const cols = Math.max(1, Math.floor(texture.width / TILE));
  const rows = Math.max(1, Math.floor(texture.height / TILE));

  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      frames.push(drawFromImageFrame(texture, col * TILE, row * TILE));
    }
  }

  return frames;
}

function expandFrameSpec(frameSpec, offset) {
  const toArray = (value) => (Array.isArray(value) ? value : [value]);

  if (typeof frameSpec === 'string' && frameSpec.includes('..')) {
    const [start, end] = frameSpec.split('..').map((part) => Number.parseInt(part, 10));
    const step = start <= end ? 1 : -1;
    const frames = [];
    for (let index = start; step > 0 ? index <= end : index >= end; index += step) {
      frames.push(offset + index);
    }
    return frames;
  }

  return toArray(frameSpec).map((frame) => offset + frame);
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

function drawDoor(ctx, random) {
  drawNoise(ctx, 0, 0, TILE, TILE, COLORS.doorClosed, '#1b0f14', 0.02, random);
  ctx.fillStyle = jitterColor('#3b262d', 10, random);
  ctx.fillRect(4, 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = 'rgba(242, 212, 92, 0.65)';
  ctx.strokeRect(6, 6, TILE - 12, TILE - 12);
  ctx.fillStyle = '#f2d45c';
  ctx.fillRect(TILE / 2 - 2, TILE / 2 - 4, 4, 10);
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

const DRAWERS = {
  floor: drawFloor,
  wall: drawWall,
  door: drawDoor,
  player: drawPlayer,
  pickup: drawPickup,
  npc: drawNpc,
  monster: drawMonster,
  prop: drawProp,
};

export async function loadSpriteSheet() {
  const textures = await loadTextureMap();
  const frames = [];
  const animations = {};

  SPRITE_ORDER.forEach((name) => {
    const texture = textures[name];
    const startIndex = frames.length;
    const spriteFrames = buildSpriteFrames(name, texture);
    frames.push(...spriteFrames);

    const animationDefs = SPRITE_ANIMATIONS[name];
    if (animationDefs) {
      animationDefs.forEach(({ name: animationName, frames: frameSpec, frameRate, loop = true }) => {
        animations[animationName] = {
          frames: expandFrameSpec(frameSpec, startIndex),
          frameRate,
          loop,
        };
      });
      if (!animations[name]) {
        animations[name] = { frames: [startIndex] };
      }
    } else {
      animations[name] = { frames: [startIndex] };
    }
  });

  const image = await canvasToImage(makeCanvas(frames));

  return SpriteSheet({
    image,
    frameWidth: TILE,
    frameHeight: TILE,
    frameMargin: 0,
    animations,
  });
}

export const SPRITE_NAMES = {
  floor: 'floor',
  wall: 'wall',
  door: 'door',
  player: 'player',
  pickup: 'pickup',
  npc: 'npc',
  monster: 'monster',
  prop: 'prop',
};
