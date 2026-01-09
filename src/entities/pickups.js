import { TILE } from '../core/constants.js';
import { resolveWorldPosition } from '../core/positioning.js';
import { getItem } from '../data/items/index.js';

export function createPickups(templates = []) {
  return templates.map((pickup) => ({
    ...pickup,
    objective: pickup.objective ?? true,
    stackable: pickup.stackable ?? false,
    storeInInventory: pickup.storeInInventory ?? true,
    quantity: pickup.quantity ?? (pickup.stackable ? 1 : undefined),
    ...resolveWorldPosition(pickup),
    collected: false,
  }));
}

export function drawPickups(ctx, camera, pickups, spriteSheet) {
  const pickupSprite = spriteSheet?.animations?.pickup;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  pickups.forEach((pickup) => {
    if (pickup.collected) return;
    const item = getItem(pickup.id);
    const icon = item?.icon ?? pickup.icon;
    const tint = item?.tint ?? pickup.tint;
    const px = pickup.x - camera.x;
    const py = pickup.y - camera.y;
    const waveSeed = (pickup.x + pickup.y) * 0.05;
    const floatOffset = Math.sin(now / 420 + waveSeed) * 3;
    const scale = 1 + Math.sin(now / 380 + waveSeed) * 0.08;
    ctx.save();
    ctx.translate(px, py + floatOffset);
    ctx.scale(scale, scale);
    if (pickupSprite) {
      pickupSprite.render({ context: ctx, x: -TILE / 2, y: -TILE / 2, width: TILE, height: TILE });
    }
    const iconSize = Math.max(14, Math.round(TILE * 0.55));
    ctx.fillStyle = '#0b0b10';
    ctx.font = `${iconSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (tint) {
      ctx.save();
      ctx.shadowColor = tint;
      ctx.shadowBlur = 8;
      ctx.fillStyle = tint;
      ctx.fillText(icon || '◆', 0, 1);
      ctx.restore();
      ctx.fillStyle = '#0b0b10';
    }
    ctx.fillText(icon || '◆', 0, 1);
    ctx.restore();
  });
}

export function collectNearbyPickups(player, pickups, inventory, { onCollect } = {}) {
  const collected = [];
  pickups.forEach((pickup) => {
    if (pickup.collected) return;
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= player.size / 2 + 12) {
      const item = getItem(pickup.id);
      const displayName = item?.name ?? pickup.name ?? pickup.id;
      const displayIcon = item?.icon ?? pickup.icon;
      const displayTint = item?.tint ?? pickup.tint;
      const handleCollected = () => {
        const approved = onCollect?.(pickup);
        if (approved === false) return false;
        pickup.collected = true;
        pickup.name = displayName;
        collected.push(pickup);
        return true;
      };

      if (pickup.storeInInventory === false) {
        handleCollected();
        return;
      }

      if (!inventory?.addItem) return;
      const stored = inventory.addItem({
        id: pickup.id,
        name: displayName,
        icon: displayIcon,
        tint: displayTint,
        objective: pickup.objective,
        stackable: pickup.stackable,
        quantity: pickup.quantity,
      });
      if (stored) {
        handleCollected();
      }
    }
  });
  return collected;
}

export function serializePickups(pickups = []) {
  return pickups.map((pickup, index) => ({
    index,
    id: pickup.id,
    x: pickup.x,
    y: pickup.y,
    collected: Boolean(pickup.collected),
  }));
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

export function restorePickups(pickups = [], snapshot = [], options = {}) {
  if (!Array.isArray(snapshot) || !snapshot.length) return;
  const bounds = normalizeBounds(options?.bounds);
  const entries = snapshot.filter((entry) => entry && typeof entry === 'object');
  if (entries.length !== snapshot.length) {
    console.warn('Neplatné položky v uložených pickupech byly ignorovány.');
  }
  const byIndex = new Map(entries.map((entry) => [entry.index, entry]));
  const byId = new Map();
  entries
    .filter((entry) => entry?.id)
    .forEach((entry) => {
      const entries = byId.get(entry.id) ?? [];
      entries.push(entry);
      byId.set(entry.id, entries);
    });

  pickups.forEach((pickup, index) => {
    let saved = byIndex.get(index);
    if (!saved && pickup.id && byId.has(pickup.id)) {
      const entries = byId.get(pickup.id);
      if (entries.length === 1) {
        saved = entries.shift();
      } else if (entries.length > 1) {
        const px = pickup.x;
        const py = pickup.y;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        entries.forEach((entry, entryIndex) => {
          if (typeof entry.x !== 'number' || typeof entry.y !== 'number') return;
          if (typeof px !== 'number' || typeof py !== 'number') return;
          const dx = entry.x - px;
          const dy = entry.y - py;
          const distance = Math.hypot(dx, dy);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = entryIndex;
          }
        });
        saved = entries.splice(bestIndex, 1)[0];
      }
      if (entries.length === 0) byId.delete(pickup.id);
    }
    if (!saved) return;
    if (Number.isFinite(saved.x)) {
      const clamped = clampToBounds(saved.x, bounds, 'x');
      if (clamped !== saved.x) {
        console.warn('Pickup pozice X mimo bounds, použita bezpečná hodnota.', saved);
      }
      pickup.x = clamped;
    } else if (saved.x != null) {
      console.warn('Pickup pozice X není číslo, ponechána výchozí hodnota.', saved);
    }
    if (Number.isFinite(saved.y)) {
      const clamped = clampToBounds(saved.y, bounds, 'y');
      if (clamped !== saved.y) {
        console.warn('Pickup pozice Y mimo bounds, použita bezpečná hodnota.', saved);
      }
      pickup.y = clamped;
    } else if (saved.y != null) {
      console.warn('Pickup pozice Y není číslo, ponechána výchozí hodnota.', saved);
    }
    pickup.collected = Boolean(saved.collected);
  });
}
