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
  canMove,
  getActorPlacements,
  getGateState,
  unlockGateToNewMap,
  tileAt,
} from './world/level.js';

const spriteSheet = await loadSpriteSheet();
const { canvas, context: ctx } = init('game');
initKeys();

const camera = { x: 0, y: 0 };
const player = createPlayer();
const pickups = createPickups();
const inventory = new Inventory(6);
const npcs = createNpcs(spriteSheet, getActorPlacements());
const objectivesCollectedEl = document.querySelector('[data-objectives-collected]');
const objectivesTotalEl = document.querySelector('[data-objectives-total]');
const objectiveTotal = pickups.filter((pickup) => pickup.objective !== false).length;
const projectiles = [];

let interactRequested = false;
let dialogueTime = 0;
let activeSpeaker = '';
let activeLine = '';
let objectivesCollected = 0;
let areaName = getLevelName();
let technicianGaveKey = false;
let deathTimeout = null;
let shootRequested = false;
const playerVitals = {
  health: 3,
  maxHealth: 3,
  invulnerableTime: 0,
};
const playerStart = { x: player.x, y: player.y };

const healthCurrentEl = document.querySelector('.hud-health-current');
const healthTotalEl = document.querySelector('.hud-health-total');

const hudTitle = document.querySelector('.title');
hudTitle.textContent = `Level 0: ${areaName}`;
renderInventory(inventory);
updateInventoryNote('Najdi komponenty a naplň šest slotů inventáře.');
updateObjectiveHud();
updateHealthHud();

function updateObjectiveHud() {
  if (objectivesCollectedEl) {
    objectivesCollectedEl.textContent = objectivesCollected;
  }
  if (objectivesTotalEl) {
    objectivesTotalEl.textContent = objectiveTotal;
  }
}

function updateHealthHud() {
  if (healthCurrentEl) healthCurrentEl.textContent = playerVitals.health;
  if (healthTotalEl) healthTotalEl.textContent = playerVitals.maxHealth;
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelector('.panel').classList.toggle('hidden');
  }
  if (event.key.toLowerCase() === 'e') {
    interactRequested = true;
  }
  if (event.code === 'Space') {
    shootRequested = true;
  }
});

const loop = GameLoop({
  update(dt) {
    updatePlayer(player, dt, { canMove });
    clampCamera(camera, player, canvas);

    if (playerVitals.invulnerableTime > 0) {
      playerVitals.invulnerableTime = Math.max(0, playerVitals.invulnerableTime - dt);
    }

    const { nearestNpc, guardCollision } = updateNpcStates(npcs, player, dt);
    const gateState = getGateState();
    const gateDistance = Math.hypot(gateState.x - player.x, gateState.y - player.y);
    const nearGate = gateDistance <= 26;

    if (guardCollision && playerVitals.invulnerableTime === 0) {
      handlePlayerHit();
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
            inventory.clearObjectiveItems();
            technicianGaveKey = true;
            unlockGateToNewMap();
            activeLine = 'Tady máš klíč. Dveře otevřeš směrem na východ do nové mapy.';
            areaName = 'Nové servisní křídlo';
            hudTitle.textContent = `Level 1: ${areaName}`;
            updateInventoryNote('Klíč získán! Východní dveře se odemkly a mapa se rozšířila.');
            renderInventory(inventory);
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
      const objectiveLoot = collected.filter((pickup) => pickup.objective !== false).length;
      if (objectiveLoot) {
        objectivesCollected += objectiveLoot;
      }
      updateObjectiveHud();
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      updateInventoryNote(`Sebráno: ${names}`);
      if (objectivesCollected >= objectiveTotal) {
        updateInventoryNote('Mise splněna: všechny komponenty jsou připravené. Vrať se za Technikem Járou.');
      }
    }

    if (shootRequested) {
      attemptShoot();
    }
    updateProjectiles(dt, npcs);

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
    drawProjectiles(ctx, camera);
    drawNpcs(ctx, camera, npcs);
    drawPlayer(ctx, camera, player, spriteSheet);
    drawCameraBounds();
  },
});

function drawCameraBounds() {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, WORLD.width * TILE - 2, WORLD.height * TILE - 2);
}

function handlePlayerHit() {
  if (deathTimeout) return;

  playerVitals.health -= 1;
  playerVitals.invulnerableTime = 1.2;
  updateHealthHud();
  if (playerVitals.health <= 0) {
    hideInteraction();
    updateInventoryNote('Hlídač klíče tě zneškodnil. Mise se restartuje...');
    dialogueTime = 0;
    deathTimeout = setTimeout(() => window.location.reload(), 900);
    return;
  }

  player.x = playerStart.x;
  player.y = playerStart.y;
  updateInventoryNote('Zásah! Přišel jsi o život. Vrať se a dávej si pozor.');
}

function attemptShoot() {
  shootRequested = false;
  const ammoCount = inventory.getItemCount('ammo');
  if (ammoCount <= 0) {
    updateInventoryNote('Došla ti munice. Posbírej další náboje.');
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
      (npc) => !npc.defeated && npc.lethal && Math.hypot(npc.x - bullet.x, npc.y - bullet.y) < TILE / 2
    );

    if (hitNpc) {
      hitNpc.health = Math.max(0, hitNpc.health - 1);
      if (hitNpc.health <= 0) {
        hitNpc.defeated = true;
        hitNpc.lethal = false;
        updateInventoryNote(`${hitNpc.name} byl vyřazen.`);
      } else {
        updateInventoryNote(`${hitNpc.name} - zásah! Zbývá ${hitNpc.health} HP.`);
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

loop.start();
