import { TILE } from '../core/constants.js';

function centerOffset() {
  return TILE / 2;
}

export function createPickups(templates = []) {
  const offset = centerOffset();
  return templates.map((pickup) => ({
    ...pickup,
    objective: pickup.objective ?? true,
    stackable: pickup.stackable ?? false,
    storeInInventory: pickup.storeInInventory ?? true,
    quantity: pickup.quantity ?? (pickup.stackable ? 1 : undefined),
    x: pickup.x ?? pickup.tx * TILE + offset,
    y: pickup.y ?? pickup.ty * TILE + offset,
    collected: false,
  }));
}

export function drawPickups(ctx, camera, pickups, spriteSheet) {
  const pickupSprite = spriteSheet?.animations?.pickup;
  pickups.forEach((pickup) => {
    if (pickup.collected) return;
    const px = pickup.x - camera.x;
    const py = pickup.y - camera.y;
    ctx.save();
    ctx.translate(px, py);
    if (pickupSprite) {
      pickupSprite.render({ context: ctx, x: -TILE / 2 + 2, y: -TILE / 2 + 2, width: TILE - 4, height: TILE - 4 });
    }
    ctx.fillStyle = pickup.tint || '#f2d45c';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0b0b10';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickup.icon || '◆', 0, 1);
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
      const handleCollected = () => {
        const approved = onCollect?.(pickup);
        if (approved === false) return false;
        pickup.collected = true;
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
        name: pickup.name,
        icon: pickup.icon,
        tint: pickup.tint,
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

export function restorePickups(pickups = [], snapshot = []) {
  if (!Array.isArray(snapshot) || !snapshot.length) return;
  const byIndex = new Map(snapshot.map((entry) => [entry.index, entry]));
  const byId = new Map();
  snapshot
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
    if (typeof saved.x === 'number') pickup.x = saved.x;
    if (typeof saved.y === 'number') pickup.y = saved.y;
    pickup.collected = Boolean(saved.collected);
  });
}
