import { TILE } from '../core/constants.js';

export function createPickupGroup(scene, pickups) {
  const group = scene.physics.add.staticGroup();

  pickups.forEach((pickup) => {
    const x = pickup.x ?? pickup.tx * TILE + TILE / 2;
    const y = pickup.y ?? pickup.ty * TILE + TILE / 2;
    const sprite = group.create(x, y, 'pickup');
    sprite.setData('pickup', pickup);
    sprite.setDepth(1);
    sprite.setCircle(12, (TILE - 24) / 2, (TILE - 24) / 2);
  });

  return group;
}

export function setupPickupOverlap(scene, player, pickupGroup, onCollect) {
  scene.physics.add.overlap(player, pickupGroup, (_player, sprite) => {
    onCollect(sprite);
  });
}

export function collectPickup(inventory, sprite) {
  if (sprite.getData('collected')) return false;
  const pickup = sprite.getData('pickup');
  if (!pickup) return false;

  const stored = inventory.addItem({
    id: pickup.id,
    name: pickup.name,
    icon: pickup.icon,
    tint: pickup.tint,
  });

  if (stored) {
    sprite.setData('collected', true);
    sprite.disableBody(true, true);
  }

  return stored;
}
