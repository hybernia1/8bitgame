import { TILE } from '../core/constants.js';
import { resolveWorldPosition } from '../core/positioning.js';

function toWorldPosition(prop = {}, fallbackIndex = 0) {
  return {
    id: prop.id ?? `prop-${fallbackIndex}`,
    name: prop.name ?? 'Krabice',
    pushable: true,
    size: prop.size ?? 26,
    sprite: prop.sprite ?? 'prop',
    color: prop.color ?? '#c49a6c',
    tint: prop.tint ?? 'rgba(114, 86, 52, 0.35)',
    ...resolveWorldPosition(prop),
  };
}

export function createPushables(placements = {}) {
  const { props = [] } = placements;
  return props.filter((prop) => prop.pushable || prop.type === 'crate').map((prop, index) => toWorldPosition(prop, index));
}

export function serializePushables(pushables = []) {
  return pushables.map(({ id, x, y }) => ({ id, x, y }));
}

function normalizeBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return null;
  const minX = Number.isFinite(bounds.minX) ? bounds.minX : 0;
  const minY = Number.isFinite(bounds.minY) ? bounds.minY : 0;
  const maxX = Number.isFinite(bounds.maxX) ? bounds.maxX : null;
  const maxY = Number.isFinite(bounds.maxY) ? bounds.maxY : null;
  if (maxX != null && maxX < minX) return null;
  if (maxY != null && maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function clampToBounds(value, bounds, axis) {
  if (!bounds) return value;
  const min = axis === 'x' ? bounds.minX : bounds.minY;
  const max = axis === 'x' ? bounds.maxX : bounds.maxY;
  if (max == null) return Math.max(min, value);
  return Math.min(Math.max(value, min), max);
}

export function restorePushables(pushables = [], snapshot = [], options = {}) {
  if (!Array.isArray(snapshot) || !snapshot.length) return;
  const bounds = normalizeBounds(options?.bounds);
  const entries = snapshot.filter((entry) => entry && typeof entry === 'object');
  if (entries.length !== snapshot.length) {
    console.warn('Neplatné položky v uložených pushables byly ignorovány.');
  }
  const saved = new Map(entries.map((entry) => [entry.id, entry]));
  pushables.forEach((prop) => {
    const match = saved.get(prop.id);
    if (!match) return;
    if (Number.isFinite(match.x)) {
      const clamped = clampToBounds(match.x, bounds, 'x');
      if (clamped !== match.x) {
        console.warn('Pushable pozice X mimo bounds, použita bezpečná hodnota.', match);
      }
      prop.x = clamped;
    } else if (match.x != null) {
      console.warn('Pushable pozice X není číslo, ponechána výchozí hodnota.', match);
    }
    if (Number.isFinite(match.y)) {
      const clamped = clampToBounds(match.y, bounds, 'y');
      if (clamped !== match.y) {
        console.warn('Pushable pozice Y mimo bounds, použita bezpečná hodnota.', match);
      }
      prop.y = clamped;
    } else if (match.y != null) {
      console.warn('Pushable pozice Y není číslo, ponechána výchozí hodnota.', match);
    }
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
    ctx.ellipse(0, half - 4, half, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sprite?.render) {
      sprite.render({ context: ctx, x: -half, y: -half, width: size, height: size });
    } else {
      ctx.fillStyle = prop.color ?? '#c49a6c';
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeRect(-half + 2, -half + 2, size - 4, size - 4);
    }

    ctx.restore();
  });
}
