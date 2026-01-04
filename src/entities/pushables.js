import { TILE, TILE_SCALE } from '../core/constants.js';

const SCALE = TILE_SCALE;
const DEFAULT_PROP_SIZE = 26 * SCALE;
const SHADOW_OFFSET = 4 * SCALE;
const SHADOW_HEIGHT = 6 * SCALE;
const OUTLINE = 2 * SCALE;

function toWorldPosition(prop = {}, fallbackIndex = 0) {
  const tx = prop.tx ?? null;
  const ty = prop.ty ?? null;
  return {
    id: prop.id ?? `prop-${fallbackIndex}`,
    name: prop.name ?? 'Krabice',
    pushable: true,
    size: prop.size ?? DEFAULT_PROP_SIZE,
    sprite: prop.sprite ?? 'prop',
    color: prop.color ?? '#c49a6c',
    tint: prop.tint ?? 'rgba(114, 86, 52, 0.35)',
    x: prop.x ?? (tx != null ? tx * TILE + TILE / 2 : 0),
    y: prop.y ?? (ty != null ? ty * TILE + TILE / 2 : 0),
  };
}

export function createPushables(placements = {}) {
  const { props = [] } = placements;
  return props.filter((prop) => prop.pushable || prop.type === 'crate').map((prop, index) => toWorldPosition(prop, index));
}

export function serializePushables(pushables = []) {
  return pushables.map(({ id, x, y }) => ({ id, x, y }));
}

export function restorePushables(pushables = [], snapshot = []) {
  const saved = new Map(snapshot.map((entry) => [entry.id, entry]));
  pushables.forEach((prop) => {
    const match = saved.get(prop.id);
    if (!match) return;
    prop.x = match.x ?? prop.x;
    prop.y = match.y ?? prop.y;
  });
}

function overlaps(x1, y1, size1, x2, y2, size2) {
  const half1 = size1 / 2;
  const half2 = size2 / 2;
  return Math.abs(x1 - x2) < half1 + half2 && Math.abs(y1 - y2) < half1 + half2;
}

function overlapsWithPadding(x1, y1, size1, x2, y2, size2, padding = 0) {
  const half1 = size1 / 2 + padding;
  const half2 = size2 / 2;
  return Math.abs(x1 - x2) < half1 + half2 && Math.abs(y1 - y2) < half1 + half2;
}

export function findBlockingPushable(pushables = [], size, nx, ny) {
  return pushables.find((prop) => overlaps(nx, ny, size, prop.x, prop.y, prop.size ?? size));
}

export function findNearbyPushable(pushables = [], size, x, y, padding = 0) {
  return pushables.find((prop) => overlapsWithPadding(x, y, size, prop.x, prop.y, prop.size ?? size, padding));
}

export function attemptPush(pushables = [], prop, moveX, moveY, canMove = () => true) {
  if (!prop) return false;
  const nextX = prop.x + moveX;
  const nextY = prop.y + moveY;
  const size = prop.size ?? TILE;
  if (!canMove(size, nextX, nextY)) return false;
  const collides = pushables.some(
    (other) => other !== prop && overlaps(nextX, nextY, size, other.x, other.y, other.size ?? size),
  );
  if (collides) return false;
  prop.x = nextX;
  prop.y = nextY;
  return true;
}

export function drawPushables(ctx, camera, pushables = [], spriteSheet) {
  pushables.forEach((prop) => {
    const px = prop.x - camera.x;
    const py = prop.y - camera.y;
    const size = prop.size ?? TILE;
    const half = size / 2;
    const sprite = spriteSheet?.animations?.[prop.sprite ?? 'prop'];

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = prop.tint;
    ctx.beginPath();
    ctx.ellipse(0, half - SHADOW_OFFSET, half, SHADOW_HEIGHT, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sprite?.render) {
      sprite.render({ context: ctx, x: -half, y: -half, width: size, height: size });
    } else {
      ctx.fillStyle = prop.color ?? '#c49a6c';
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeRect(-half + OUTLINE, -half + OUTLINE, size - OUTLINE * 2, size - OUTLINE * 2);
    }

    ctx.restore();
  });
}
