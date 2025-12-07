import { init, GameLoop, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { loadSpriteSheet } from './core/sprites.js';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { createNpcs, drawNpcs, updateNpcStates } from './entities/npc.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { hideInteraction, showDialogue, showPrompt } from './ui/interaction.js';
import { clampCamera, drawGrid, drawLevel, getLevelName, canMove, getActorPlacements } from './world/level.js';

const spriteSheet = await loadSpriteSheet();
const { canvas, context: ctx } = init('game');
initKeys();

const camera = { x: 0, y: 0 };
const player = createPlayer();
const pickups = createPickups();
const inventory = new Inventory(6);
const npcs = createNpcs(spriteSheet, getActorPlacements());

let interactRequested = false;
let dialogueTime = 0;
let activeSpeaker = '';
let activeLine = '';

const hudTitle = document.querySelector('.title');
hudTitle.textContent = `Level 0: ${getLevelName()}`;
renderInventory(inventory);
updateInventoryNote('Najdi komponenty a naplň šest slotů inventáře.');

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelector('.panel').classList.toggle('hidden');
  }
  if (event.key.toLowerCase() === 'e') {
    interactRequested = true;
  }
});

const loop = GameLoop({
  update(dt) {
    updatePlayer(player, dt, { canMove });
    clampCamera(camera, player, canvas);

    const { nearestNpc } = updateNpcStates(npcs, player);

    if (interactRequested && nearestNpc?.nearby) {
      activeSpeaker = nearestNpc.name;
      activeLine = nearestNpc.dialogue || 'Ráda tě vidím v základně.';
      nearestNpc.hasSpoken = true;
      dialogueTime = 4;
      showDialogue(activeSpeaker, activeLine);
    }
    interactRequested = false;

    const collected = collectNearbyPickups(player, pickups, inventory);
    if (collected.length) {
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      updateInventoryNote(`Sebráno: ${names}`);
    }

    if (dialogueTime > 0) {
      dialogueTime -= dt;
      showDialogue(activeSpeaker, activeLine);
    } else if (nearestNpc?.nearby) {
      showPrompt(`Stiskni E pro rozhovor s ${nearestNpc.name}`);
    } else {
      hideInteraction();
    }
  },
  render() {
    drawGrid(ctx, canvas);
    drawLevel(ctx, camera, spriteSheet);
    drawPickups(ctx, camera, pickups, spriteSheet);
    drawNpcs(ctx, camera, npcs);
    drawPlayer(ctx, camera, player, spriteSheet);
    drawCameraBounds();
  },
});

function drawCameraBounds() {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, WORLD.width * TILE - 2, WORLD.height * TILE - 2);
}

loop.start();
