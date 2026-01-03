import { TILE } from '../core/constants.js';

export function createCombatSystem({ inventory, projectiles, player, renderInventory, tileAt, showNote }) {
  function attemptShoot() {
    const ammoCount = inventory.getItemCount('ammo');
    if (ammoCount <= 0) {
      showNote?.('note.combat.noAmmo');
      return;
    }

    inventory.consumeItem('ammo', 1);
    renderInventory(inventory);

    const direction = player.lastDirection ?? { x: 1, y: 0 };
    const speed = 260;
    const magnitude = Math.hypot(direction.x, direction.y) || 1;
    projectiles.push({
      x: player.x,
      y: player.y,
      dx: direction.x / magnitude,
      dy: direction.y / magnitude,
      speed,
      lifetime: 1.2,
    });
  }

  function updateProjectiles(dt, npcsList) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const bullet = projectiles[i];
      bullet.x += bullet.dx * bullet.speed * dt;
      bullet.y += bullet.dy * bullet.speed * dt;
      bullet.lifetime -= dt;

      const tile = tileAt(bullet.x, bullet.y);
      if (tile !== 0 || bullet.lifetime <= 0) {
        projectiles.splice(i, 1);
        continue;
      }

      const hitNpc = npcsList.find(
        (npc) =>
          !npc.defeated &&
          npc.lethal &&
          Math.hypot(npc.x - bullet.x, npc.y - bullet.y) < (npc.size ?? TILE) / 2
      );

      if (hitNpc) {
        hitNpc.health = Math.max(0, hitNpc.health - 1);
        if (hitNpc.health <= 0) {
          hitNpc.defeated = true;
          hitNpc.lethal = false;
          showNote?.('note.combat.npcDown', { name: hitNpc.name });
        } else {
          showNote?.('note.combat.npcHit', { name: hitNpc.name, hp: hitNpc.health });
        }
        projectiles.splice(i, 1);
      }
    }
  }

  function drawProjectiles(drawCtx, cam) {
    drawCtx.save();
    drawCtx.fillStyle = '#f28f5c';
    projectiles.forEach((bullet) => {
      drawCtx.beginPath();
      drawCtx.arc(bullet.x - cam.x, bullet.y - cam.y, 4, 0, Math.PI * 2);
      drawCtx.fill();
    });
    drawCtx.restore();
  }

  return {
    attemptShoot,
    updateProjectiles,
    drawProjectiles,
  };
}
