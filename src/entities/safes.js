import { TILE } from '../core/constants.js';

export const SAFE_INTERACT_DISTANCE = TILE;

function toWorldPosition(entry = {}, fallbackIndex = 0) {
  const tx = Number.isFinite(entry.tx) ? entry.tx : null;
  const ty = Number.isFinite(entry.ty) ? entry.ty : null;
  const codeLength = Math.max(1, Math.floor(entry.codeLength ?? 4));
  const resolvedCode =
    typeof entry.code === 'string'
      ? entry.code
      : entry.code != null
        ? String(entry.code).padStart(codeLength, '0')
        : '0000';

  return {
    id: entry.id ?? `safe-${fallbackIndex}`,
    name: entry.name ?? 'Sejf',
    code: resolvedCode,
    codeLength,
    reward: entry.reward ?? null,
    rewardNote: entry.rewardNote ?? null,
    emptyNote: entry.emptyNote ?? null,
    opened: entry.opened ?? false,
    rewardClaimed: entry.rewardClaimed ?? false,
    size: entry.size ?? Math.round(TILE * 0.82),
    sprite: entry.sprite ?? 'prop',
    color: entry.color ?? '#d4b484',
    tint: entry.tint ?? 'rgba(114, 86, 52, 0.35)',
    x: entry.x ?? (tx != null ? tx * TILE + TILE / 2 : 0),
    y: entry.y ?? (ty != null ? ty * TILE + TILE / 2 : 0),
    nearby: false,
  };
}

export function createSafes(placements = {}) {
  const safes = placements.safes ?? [];
  return safes.map((entry, index) => toWorldPosition(entry, index));
}

export function findNearestSafe(safes = [], x, y, radius = SAFE_INTERACT_DISTANCE) {
  let nearest = null;
  let bestDistance = Infinity;

  safes.forEach((safe) => {
    const distance = Math.hypot((safe?.x ?? 0) - x, (safe?.y ?? 0) - y);
    const nearby = distance <= radius;
    safe.nearby = nearby;
    if (distance < bestDistance) {
      nearest = safe;
      bestDistance = distance;
    }
  });

  return { nearestSafe: nearest, safeDistance: bestDistance };
}

export function drawSafes(ctx, camera, safes = [], spriteSheet) {
  safes.forEach((safe) => {
    const px = safe.x - camera.x;
    const py = safe.y - camera.y;
    const size = safe.size ?? TILE;
    const half = size / 2;
    const sprite = spriteSheet?.animations?.[safe.sprite ?? 'prop'];

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = safe.tint;
    ctx.beginPath();
    ctx.ellipse(0, half - 4, half * 0.92, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sprite?.render) {
      sprite.render({ context: ctx, x: -half, y: -half, width: size, height: size });
    } else {
      ctx.fillStyle = safe.color;
      ctx.fillRect(-half, -half, size, size);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.strokeRect(-half + 2, -half + 2, size - 4, size - 4);
    }

    ctx.fillStyle = safe.opened ? '#6ef2a4' : '#f2d45c';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(safe.opened ? '🔓' : '🔒', 0, 2);

    if (safe.nearby && !safe.opened) {
      ctx.strokeStyle = 'rgba(110, 242, 164, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, half, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}

export function serializeSafes(safes = []) {
  return safes.map(({ id, opened, rewardClaimed }) => ({
    id,
    opened: Boolean(opened),
    rewardClaimed: Boolean(rewardClaimed),
  }));
}

export function restoreSafes(safes = [], snapshot = []) {
  if (!Array.isArray(snapshot) || !snapshot.length) return;
  const saved = new Map(snapshot.map((entry) => [entry?.id, entry]));
  safes.forEach((safe, index) => {
    const entry = (safe?.id && saved.get(safe.id)) || snapshot[index];
    if (!entry) return;
    safe.opened = Boolean(entry.opened);
    safe.rewardClaimed = Boolean(entry.rewardClaimed);
  });
}
