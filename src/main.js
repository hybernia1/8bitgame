import { TILE, WORLD } from './core/constants.js';
import { ensurePhaserReady } from './core/phaserLoader.js';
import { resolveRenderType } from './core/environment.js';
import { demoLevel } from './data/demoLevel.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { hideInteraction, showDialogue, showPrompt } from './ui/interaction.js';
import { registerGeneratedTextures } from './core/sprites.js';
import { createLevel } from './world/level.js';
import { createPlayer, createInput, updatePlayerMovement } from './entities/player.js';
import { createPickupGroup, setupPickupOverlap, collectPickup } from './entities/pickups.js';
import { createNpcs, findNearestNpc } from './entities/npc.js';

const Phaser = await ensurePhaserReady();

const inventory = new Inventory(6);
renderInventory(inventory);
updateInventoryNote('Najdi komponenty a naplň šest slotů inventáře.');

const hudTitle = document.querySelector('.title');
hudTitle.textContent = `Level 0: ${demoLevel.name}`;

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelector('.panel').classList.toggle('hidden');
  }
});

class DemoScene extends Phaser.Scene {
  constructor() {
    super('DemoScene');
    this.interactRequested = false;
    this.dialogueTime = 0;
    this.activeSpeaker = '';
    this.activeLine = '';
    this.npcEntries = [];
  }

  preload() {
    registerGeneratedTextures(this);
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width * TILE, WORLD.height * TILE);

    this.createLevel();
    this.createPlayer();
    this.createPickups();
    this.createNpcs();
    this.createCamera();
    this.registerInput();
  }

  update(_, delta) {
    this.updatePlayerMovement();
    this.updateNpcStates(delta);
  }

  createLevel() {
    const { walls } = createLevel(this);
    this.walls = walls;
  }

  createPlayer() {
    const { playerStart } = demoLevel.actors;
    this.player = createPlayer(this, playerStart, this.walls);
  }

  createPickups() {
    this.pickups = createPickupGroup(this, demoLevel.pickups);
    setupPickupOverlap(this, this.player, this.pickups, (sprite) => this.collectPickup(sprite));
  }

  createNpcs() {
    this.npcEntries = createNpcs(this, demoLevel.actors);
  }

  createCamera() {
    const camera = this.cameras.main;
    camera.setBackgroundColor('#0b0b10');
    camera.setBounds(0, 0, WORLD.width * TILE, WORLD.height * TILE);
    camera.startFollow(this.player, true, 0.15, 0.15);
  }

  registerInput() {
    this.inputState = createInput(this);

    this.input.keyboard.on('keydown-E', () => {
      this.interactRequested = true;
    });
  }

  updatePlayerMovement() {
    updatePlayerMovement(this.player, this.inputState);
  }

  updateNpcStates(delta) {
    const nearest = findNearestNpc(this.player, this.npcEntries);

    if (this.interactRequested && nearest?.nearby) {
      this.activeSpeaker = nearest.name;
      this.activeLine = nearest.dialogue || 'Ráda tě vidím v základně.';
      nearest.hasSpoken = true;
      this.dialogueTime = 4;
      showDialogue(this.activeSpeaker, this.activeLine);
    }
    this.interactRequested = false;

    const dt = delta / 1000;
    if (this.dialogueTime > 0) {
      this.dialogueTime -= dt;
      showDialogue(this.activeSpeaker, this.activeLine);
    } else if (nearest?.nearby) {
      showPrompt(`Stiskni E pro rozhovor s ${nearest.name}`);
    } else {
      hideInteraction();
    }
  }

  collectPickup(sprite) {
    const stored = collectPickup(inventory, sprite);
    if (stored) {
      renderInventory(inventory);
      const pickup = sprite.getData('pickup');
      updateInventoryNote(`Sebráno: ${pickup.name}`);
    }
  }
}

const renderType = resolveRenderType(Phaser);

const game = new Phaser.Game({
  type: renderType,
  width: 640,
  height: 480,
  canvas: document.getElementById('game'),
  backgroundColor: '#0b0b10',
  pixelArt: true,
  renderType,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: DemoScene,
});

export default game;
