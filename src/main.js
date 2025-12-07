import { init, GameLoop, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { clampCamera, drawGrid, drawLevel, getLevelName, canMove } from './world/level.js';

const { canvas, context: ctx } = init('game');
initKeys();

const camera = { x: 0, y: 0 };
const player = createPlayer();
const pickups = createPickups();
const inventory = new Inventory(6);

const hudTitle = document.querySelector('.title');
hudTitle.textContent = `Level 0: ${getLevelName()}`;
renderInventory(inventory);
updateInventoryNote('Najdi komponenty a naplň šest slotů inventáře.');

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelector('.panel').classList.toggle('hidden');
  }
});

const loop = GameLoop({
  update(dt) {
    updatePlayer(player, dt, { canMove });
    clampCamera(camera, player, canvas);

    const collected = collectNearbyPickups(player, pickups, inventory);
    if (collected.length) {
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      updateInventoryNote(`Sebráno: ${names}`);
    }
  },
  render() {
    drawGrid(ctx, canvas);
    drawLevel(ctx, camera);
    drawPickups(ctx, camera, pickups);
    drawPlayer(ctx, camera, player);
    drawCameraBounds();
  },
});

function drawCameraBounds() {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, WORLD.width * TILE - 2, WORLD.height * TILE - 2);
}

loop.start();
