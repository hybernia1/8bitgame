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
  drawLighting,
  drawLightSwitches,
  getLevelName,
  canMove,
  getActorPlacements,
  getGateState,
  unlockGateToNewMap,
  tileAt,
  isLitAt,
  getLightSwitches,
  activateLightSwitch,
} from './world/level.js';

const spriteSheet = await loadSpriteSheet();
const { canvas, context: ctx } = init('game');
initKeys();

const camera = { x: 0, y: 0 };
const player = createPlayer(spriteSheet);
const pickups = createPickups();
const inventory = new Inventory(6);
const npcs = createNpcs(spriteSheet, getActorPlacements());
const SWITCH_INTERACT_DISTANCE = TILE;
const objectivesCollectedEl = document.querySelector('[data-objectives-collected]');
const objectivesTotalEl = document.querySelector('[data-objectives-total]');
const objectiveTotal = pickups.filter((pickup) => pickup.objective !== false).length;
const projectiles = [];
let gateKeyUsed = false;

let interactRequested = false;
let dialogueTime = 0;
let activeSpeaker = '';
let activeLine = '';
let objectivesCollected = 0;
let areaName = getLevelName();
let technicianGaveKey = false;
let caretakerGaveApple = false;
let deathTimeout = null;
let shootRequested = false;
let darknessTimer = 0;
const playerVitals = {
  health: 3,
  maxHealth: 3,
  invulnerableTime: 0,
};
const playerStart = { x: player.x, y: player.y };

const healthCurrentEl = document.querySelector('.hud-health-current');
const healthTotalEl = document.querySelector('.hud-health-total');

const hudTitle = document.querySelector('.level-title');
hudTitle.textContent = `Level 0: ${areaName}`;
renderInventory(inventory);
updateInventoryNote('Mapa je ponořená do tmy. Hledej vypínače na zdech a seber všechny komponenty.');
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
    const inventoryPanel = document.querySelector('.inventory');
    inventoryPanel?.classList.toggle('hidden');
    return;
  }
  if (event.key.toLowerCase() === 'e') {
    interactRequested = true;
    return;
  }
  if (event.code === 'Space') {
    shootRequested = true;
    return;
  }
  const slotNumber = Number.parseInt(event.key, 10);
  if (Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= inventory.slots.length) {
    useInventorySlot(slotNumber - 1);
  }
});

document.querySelector('.inventory-grid')?.addEventListener('click', (event) => {
  const slot = event.target.closest('.inventory-slot');
  if (!slot) return;
  const index = Number.parseInt(slot.dataset.index, 10) - 1;
  if (Number.isInteger(index)) {
    useInventorySlot(index);
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
    const { activeSwitch, switchDistance } = findNearestLightSwitch();

    if (guardCollision && playerVitals.invulnerableTime === 0) {
      handlePlayerHit();
    }

    if (interactRequested && activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      const toggled = activateLightSwitch(activeSwitch.id);
      if (toggled) {
        updateInventoryNote(`Vypínač ${activeSwitch.name} rozsvítil další část místnosti.`);
      } else {
        updateInventoryNote('Vypínač už je aktivovaný.');
      }
    } else if (interactRequested && nearestNpc?.nearby) {
      activeSpeaker = nearestNpc.name;
      if (nearestNpc.id === 'caretaker') {
        const hasApple = inventory.getItemCount('apple') > 0;
        if (!caretakerGaveApple) {
          const stored = inventory.addItem({
            id: 'apple',
            name: 'Jablko',
            icon: '🍎',
            tint: '#f25c5c',
          });

          if (stored) {
            caretakerGaveApple = true;
            activeLine = 'Tady máš jablko, doplní ti síly. Stiskni číslo slotu nebo na něj klikni v inventáři.';
            updateInventoryNote('Správce ti předal jablko. Použij číslo slotu (1-6) nebo klikni na slot pro doplnění jednoho života.');
            renderInventory(inventory);
          } else {
            activeLine = 'Inventář máš plný, uvolni si místo, ať ti můžu dát jablko.';
            updateInventoryNote('Nemáš místo na jablko. Uvolni slot a promluv si se Správcem znovu.');
          }
        } else if (hasApple) {
          activeLine = 'Jablko máš v inventáři. Klikni na slot nebo stiskni jeho číslo, až budeš potřebovat život.';
        } else {
          activeLine = nearestNpc.dialogue || 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.';
        }
      } else if (nearestNpc.id === 'technician') {
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
      if (!gateKeyUsed) {
        const consumed = inventory.consumeItem('gate-key', 1);
        if (consumed) {
          gateKeyUsed = true;
          renderInventory(inventory);
          updateInventoryNote('Klíč se zasunul do zámku a zmizel z inventáře.');
        }
      }
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
    applyDarknessDamage(dt);

    if (dialogueTime > 0) {
      dialogueTime -= dt;
      showDialogue(activeSpeaker, activeLine);
    } else if (nearestNpc?.nearby) {
      showPrompt(`Stiskni E pro rozhovor s ${nearestNpc.name}`);
    } else if (activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      showPrompt('Stiskni E pro aktivaci vypínače');
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
    drawLightSwitches(ctx, camera);
    drawPickups(ctx, camera, pickups, spriteSheet);
    drawProjectiles(ctx, camera);
    drawNpcs(ctx, camera, npcs);
    drawPlayer(ctx, camera, player, spriteSheet);
    drawLighting(ctx, camera);
    drawCameraBounds();
  },
});

function drawCameraBounds() {
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.strokeRect(1, 1, WORLD.width * TILE - 2, WORLD.height * TILE - 2);
}

function handlePlayerHit() {
  applyDamage({
    invulnerability: 1.2,
    resetPosition: true,
    note: 'Zásah! Přišel jsi o život. Vrať se a dávej si pozor.',
    deathNote: 'Hlídač klíče tě zneškodnil. Mise se restartuje...',
  });
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

function applyDamage({ invulnerability = 0, resetPosition = false, note, deathNote }) {
  if (deathTimeout || playerVitals.health <= 0) return;

  playerVitals.health -= 1;
  playerVitals.invulnerableTime = Math.max(playerVitals.invulnerableTime, invulnerability);
  updateHealthHud();

  if (playerVitals.health <= 0) {
    handlePlayerDeath(deathNote);
    return;
  }

  if (resetPosition) {
    player.x = playerStart.x;
    player.y = playerStart.y;
  }

  if (note) {
    updateInventoryNote(note);
  }
}

function handlePlayerDeath(deathNote) {
  if (deathTimeout) return;
  hideInteraction();
  updateInventoryNote(deathNote || 'Tma tě pohltila. Mise se restartuje...');
  dialogueTime = 0;
  deathTimeout = setTimeout(() => window.location.reload(), 900);
}

function applyDarknessDamage(dt) {
  if (isLitAt(player.x, player.y)) {
    darknessTimer = 0;
    return;
  }

  darknessTimer += dt;
  if (darknessTimer >= 1 && playerVitals.invulnerableTime <= 0) {
    darknessTimer = 0;
    applyDamage({
      invulnerability: 1,
      note: 'Tma pálí! Najdi vypínač a rozsviť část místnosti.',
      deathNote: 'Tma tě zcela pohltila. Mise se restartuje...',
    });
  }
}

function findNearestLightSwitch() {
  let best = null;
  let bestDistance = Infinity;
  getLightSwitches().forEach((sw) => {
    const sx = sw.tx * TILE + TILE / 2;
    const sy = sw.ty * TILE + TILE / 2;
    const dist = Math.hypot(player.x - sx, player.y - sy);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = sw;
    }
  });
  return { activeSwitch: best, switchDistance: bestDistance };
}

function useInventorySlot(slotIndex) {
  const item = inventory.slots[slotIndex];
  if (!item) {
    updateInventoryNote(`Slot ${slotIndex + 1} je prázdný.`);
    return;
  }

  if (item.id === 'apple') {
    if (playerVitals.health >= playerVitals.maxHealth) {
      updateInventoryNote('Máš plné zdraví, jablko si nech na horší chvíli.');
      return;
    }

    const consumed = inventory.consumeSlot(slotIndex, 1);
    if (consumed) {
      playerVitals.health = Math.min(playerVitals.maxHealth, playerVitals.health + 1);
      updateHealthHud();
      renderInventory(inventory);
      updateInventoryNote('Jablko ti doplnilo jeden život.');
    }
    return;
  }

  updateInventoryNote('Tenhle předmět teď nemůžeš použít.');
}

loop.start();
