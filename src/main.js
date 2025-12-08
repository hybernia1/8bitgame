import { init, GameLoop, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { loadSpriteSheet } from './core/sprites.js';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { createNpcs, drawNpcs, updateNpcStates } from './entities/npc.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { hideInteraction, showDialogue, showPrompt } from './ui/interaction.js';
import {
  clampCamera,
  drawGrid,
  drawLevel,
  getLevelName,
  getTextureTheme,
  canMove,
  getActorPlacements,
  getGateState,
  unlockGateToNewMap,
} from './world/level.js';

const spriteSheet = await loadSpriteSheet(getTextureTheme());
const { canvas, context: ctx } = init('game');
initKeys();

const camera = { x: 0, y: 0 };
const player = createPlayer();
const pickups = createPickups();
const inventory = new Inventory(6);
const npcs = createNpcs(spriteSheet, getActorPlacements());
const objectivesCollectedEl = document.querySelector('[data-objectives-collected]');
const objectivesTotalEl = document.querySelector('[data-objectives-total]');
const objectiveTotal = pickups.length;

let interactRequested = false;
let dialogueTime = 0;
let activeSpeaker = '';
let activeLine = '';
let objectivesCollected = 0;
let areaName = getLevelName();
let technicianGaveKey = false;
let deathTimeout = null;

const hudTitle = document.querySelector('.title');
hudTitle.textContent = `Level 0: ${areaName}`;
renderInventory(inventory);
updateInventoryNote('Najdi komponenty a naplň šest slotů inventáře.');
updateObjectiveHud();

function updateObjectiveHud() {
  if (objectivesCollectedEl) {
    objectivesCollectedEl.textContent = objectivesCollected;
  }
  if (objectivesTotalEl) {
    objectivesTotalEl.textContent = objectiveTotal;
  }
}

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

    const { nearestNpc, guardCollision } = updateNpcStates(npcs, player, dt);
    const gateState = getGateState();
    const gateDistance = Math.hypot(gateState.x - player.x, gateState.y - player.y);
    const nearGate = gateDistance <= 26;

    if (guardCollision) {
      handlePlayerDeath();
      return;
    }

    if (interactRequested && nearestNpc?.nearby) {
      activeSpeaker = nearestNpc.name;
      if (nearestNpc.id === 'technician') {
        const readyForReward = objectivesCollected >= objectiveTotal;
        if (!readyForReward) {
          activeLine =
            'Musíš donést všechny díly. Jakmile je máš, vrátíš se pro klíč a já ti otevřu dveře.';
        } else if (!technicianGaveKey) {
          const stored = inventory.addItem({
            id: 'gate-key',
            name: 'Klíč od dveří',
            icon: '🔑',
            tint: '#f2d45c',
          });

          if (stored) {
            technicianGaveKey = true;
            unlockGateToNewMap();
            activeLine = 'Tady máš klíč. Dveře otevřeš směrem na východ do nové mapy.';
            areaName = 'Nové servisní křídlo';
            hudTitle.textContent = `Level 1: ${areaName}`;
            updateInventoryNote('Klíč získán! Východní dveře se odemkly a mapa se rozšířila.');
          } else {
            activeLine = 'Tvůj inventář je plný, uvolni si místo na klíč.';
          }
        } else {
          activeLine = 'Dveře už jsou otevřené. Vejdi dál a pozor na nové prostory.';
        }
      } else {
        activeLine = nearestNpc.dialogue || 'Ráda tě vidím v základně.';
      }
      nearestNpc.hasSpoken = true;
      if (nearestNpc.info && !nearestNpc.infoShared) {
        updateInventoryNote(nearestNpc.info);
        nearestNpc.infoShared = true;
      }
      dialogueTime = 4;
      showDialogue(activeSpeaker, activeLine);
    } else if (interactRequested && nearGate && !gateState.locked) {
      activeSpeaker = 'Systém Dveří';
      activeLine = 'Vstup potvrzen. Přecházíš do nového mapového křídla.';
      dialogueTime = 3;
      showDialogue(activeSpeaker, activeLine);
    }
    interactRequested = false;

    const collected = collectNearbyPickups(player, pickups, inventory);
    if (collected.length) {
      objectivesCollected += collected.length;
      updateObjectiveHud();
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      updateInventoryNote(`Sebráno: ${names}`);
      if (objectivesCollected >= objectiveTotal) {
        updateInventoryNote('Mise splněna: všechny komponenty jsou připravené. Vrať se za Technikem Járou.');
      }
    }

    if (dialogueTime > 0) {
      dialogueTime -= dt;
      showDialogue(activeSpeaker, activeLine);
    } else if (nearestNpc?.nearby) {
      showPrompt(`Stiskni E pro rozhovor s ${nearestNpc.name}`);
    } else if (nearGate) {
      if (gateState.locked) {
        showPrompt('Dveře jsou zamčené. Technik Jára má klíč.');
      } else {
        showPrompt('Dveře jsou otevřené, stiskni E pro vstup do nové mapy.');
      }
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

function handlePlayerDeath() {
  if (deathTimeout) return;

  hideInteraction();
  updateInventoryNote('Hlídač klíče tě zneškodnil. Mise se restartuje...');
  dialogueTime = 0;
  deathTimeout = setTimeout(() => window.location.reload(), 900);
}

loop.start();
