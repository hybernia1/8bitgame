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

export function collectNearbyPickups(player, pickups, inventory) {
  const collected = [];
  pickups.forEach((pickup) => {
    if (pickup.collected) return;
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= player.size / 2 + 12) {
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
        pickup.collected = true;
        collected.push(pickup);
      }
    }
  });
  return collected;
}
