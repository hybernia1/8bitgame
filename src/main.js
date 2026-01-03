import { init, initKeys } from './kontra.mjs';
import { COLORS, TILE, WORLD } from './core/constants.js';
import { createGame } from './core/game.js';
import { loadSpriteSheet } from './core/sprites.js';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player.js';
import { collectNearbyPickups, createPickups, drawPickups } from './entities/pickups.js';
import { createNpcs, drawNpcs, updateNpcStates } from './entities/npc.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { itemHandlers } from './items.js';
import { drawGrid } from './world/level-instance.js';
import { createInputSystem } from './systems/input.js';
import { createCombatSystem } from './systems/combat.js';
import { createInteractionSystem } from './systems/interactions.js';
import { createHudSystem } from './systems/hud.js';
import { createGameLoop } from './systems/game-loop.js';

const spriteSheet = await loadSpriteSheet();
const { canvas, context: ctx } = init('game');
initKeys();

const inventory = new Inventory(6);
const game = createGame({ inventory });
const level = game.loadLevel();
const placements = level.getActorPlacements();

const camera = { x: 0, y: 0 };
const player = createPlayer(spriteSheet, placements);
const pickups = createPickups(level.getPickupTemplates());
const npcs = createNpcs(spriteSheet, placements);
const objectivesCollectedEl = document.querySelector('[data-objectives-collected]');
const objectivesTotalEl = document.querySelector('[data-objectives-total]');
const levelMeta = level.meta;
const objectiveTotal = level.getObjectiveTotal();
const projectiles = [];

let dialogueTime = 0;
let activeSpeaker = '';
let activeLine = '';
let objectivesCollected = 0;
let areaName = levelMeta.title ?? levelMeta.name;
let levelNumber = levelMeta.levelNumber ?? 0;
let subtitle = levelMeta.subtitle ?? '';
let deathTimeout = null;
let darknessTimer = 0;
const playerVitals = {
  health: 3,
  maxHealth: 3,
  invulnerableTime: 0,
};
const playerStart = { x: placements.playerStart?.x ?? player.x, y: placements.playerStart?.y ?? player.y };

const healthCurrentEl = document.querySelector('.hud-health-current');
const healthTotalEl = document.querySelector('.hud-health-total');

const hudTitle = document.querySelector('.level-title');
const hudSubtitle = document.querySelector('.subtitle');
renderInventory(inventory);
updateInventoryNote('Mapa je ponořená do tmy. Hledej vypínače na zdech a seber všechny komponenty.');
const hudSystem = createHudSystem({
  hudTitle,
  hudSubtitle,
  objectiveTotal,
  objectivesCollectedEl,
  objectivesTotalEl,
  healthCurrentEl,
  healthTotalEl,
});

hudSystem.updateAreaTitle(areaName, levelNumber);
hudSystem.updateSubtitle(subtitle);
game.setHud(hudSystem);

const inputSystem = createInputSystem({
  inventory,
  playerVitals,
  updateHealthHud: () => hudSystem.updateHealthHud(playerVitals),
  renderInventory,
  updateInventoryNote,
  handlers: itemHandlers,
});

const combatSystem = createCombatSystem({
  inventory,
  projectiles,
  player,
  renderInventory,
  tileAt: level.tileAt.bind(level),
});

const interactionState = {
  get dialogueTime() {
    return dialogueTime;
  },
  set dialogueTime(value) {
    dialogueTime = value;
  },
  get activeSpeaker() {
    return activeSpeaker;
  },
  set activeSpeaker(value) {
    activeSpeaker = value;
  },
  get activeLine() {
    return activeLine;
  },
  set activeLine(value) {
    activeLine = value;
  },
  get objectivesCollected() {
    return objectivesCollected;
  },
  set objectivesCollected(value) {
    objectivesCollected = value;
  },
  get areaName() {
    return areaName;
  },
  set areaName(value) {
    areaName = value;
  },
  get levelNumber() {
    return levelNumber;
  },
  set levelNumber(value) {
    levelNumber = value;
  },
  get subtitle() {
    return subtitle;
  },
  set subtitle(value) {
    subtitle = value;
  },
  flags: {
    technicianGaveKey: false,
    caretakerGaveApple: false,
    gateKeyUsed: false,
  },
  quests: {},
  get technicianGaveKey() {
    return this.flags.technicianGaveKey;
  },
  set technicianGaveKey(value) {
    this.flags.technicianGaveKey = value;
  },
  get caretakerGaveApple() {
    return this.flags.caretakerGaveApple;
  },
  set caretakerGaveApple(value) {
    this.flags.caretakerGaveApple = value;
  },
  get gateKeyUsed() {
    return this.flags.gateKeyUsed;
  },
  set gateKeyUsed(value) {
    this.flags.gateKeyUsed = value;
  },
  playerVitals,
  handlePlayerHit,
};

const interactionSystem = createInteractionSystem({
  inventory,
  pickups,
  npcs,
  hud: hudSystem,
  state: interactionState,
  level,
  game,
  renderInventory,
  updateInventoryNote,
  updateObjectiveHud: (count) => hudSystem.updateObjectiveHud(count ?? interactionState.objectivesCollected),
  collectNearbyPickups,
});

hudSystem.updateObjectiveHud(interactionState.objectivesCollected);
hudSystem.updateHealthHud(playerVitals);

const loop = createGameLoop({
  update(dt) {
    updatePlayer(player, dt, { canMove: level.canMove.bind(level) });
    level.clampCamera(camera, player, canvas);

    if (playerVitals.invulnerableTime > 0) {
      playerVitals.invulnerableTime = Math.max(0, playerVitals.invulnerableTime - dt);
    }

    const { nearestNpc, guardCollision } = updateNpcStates(npcs, player, dt);

    if (guardCollision && playerVitals.invulnerableTime === 0) {
      handlePlayerHit();
    }

    const interactContext = interactionSystem.handleInteract(player, {
      interactRequested: inputSystem.consumeInteractRequest(),
      nearestNpc,
      guardCollision,
    });

    if (inputSystem.consumeShootRequest()) {
      combatSystem.attemptShoot();
    }
    combatSystem.updateProjectiles(dt, npcs);
    applyDarknessDamage(dt);

    interactionSystem.updateInteractions(player, {
      ...interactContext,
      dt,
    });
  },
  render() {
    drawGrid(ctx, canvas);
    level.drawLevel(ctx, camera, spriteSheet);
    level.drawLightSwitches(ctx, camera);
    drawPickups(ctx, camera, pickups, spriteSheet);
    combatSystem.drawProjectiles(ctx, camera);
    drawNpcs(ctx, camera, npcs);
    drawPlayer(ctx, camera, player, spriteSheet);
    level.drawLighting(ctx, camera);
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

function applyDamage({ invulnerability = 0, resetPosition = false, note, deathNote }) {
  if (deathTimeout || playerVitals.health <= 0) return;

  playerVitals.health -= 1;
  playerVitals.invulnerableTime = Math.max(playerVitals.invulnerableTime, invulnerability);
  hudSystem.updateHealthHud(playerVitals);

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
  hudSystem.hideInteraction();
  updateInventoryNote(deathNote || 'Tma tě pohltila. Mise se restartuje...');
  dialogueTime = 0;
  deathTimeout = setTimeout(() => window.location.reload(), 900);
}

function applyDarknessDamage(dt) {
  if (level.isLitAt(player.x, player.y)) {
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

loop.start();
