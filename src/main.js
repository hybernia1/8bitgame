import { TILE, WORLD, COLORS } from './core/constants.js';
import { demoLevel } from './data/demoLevel.js';
import { renderInventory, Inventory, updateInventoryNote } from './ui/inventory.js';
import { hideInteraction, showDialogue, showPrompt } from './ui/interaction.js';

const TALK_RADIUS = 26;
const levelGrid = [];
for (let row = 0; row < WORLD.height; row += 1) {
  const start = row * WORLD.width;
  levelGrid.push(demoLevel.map.slice(start, start + WORLD.width));
}

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
    this.createTileTextures();
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

  createTileTextures() {
    this.createTexture('floor', (g) => {
      g.fillStyle(COLORS.floor, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(COLORS.floorGlow, 1);
      g.fillRect(0, TILE - 6, TILE, 6);
      g.fillStyle('rgba(92, 242, 204, 0.15)', 1);
      g.fillRect(4, 4, TILE - 8, 6);
    });

    this.createTexture('wall', (g) => {
      g.fillStyle(COLORS.wall, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(COLORS.wallInner, 1);
      g.fillRect(2, 2, TILE - 4, TILE - 4);
      g.fillStyle('#0c0c15', 1);
      g.fillRect(5, 5, TILE - 10, TILE - 10);
    });

    this.createTexture('player', (g) => {
      g.fillStyle(COLORS.gridBorder, 1);
      g.fillRect(4, 4, TILE - 8, TILE - 8);
      g.fillStyle('#5cf2cc', 1);
      g.fillRect(6, 6, TILE - 12, TILE - 12);
      g.fillStyle('#183e35', 1);
      g.fillRect(6, TILE - 10, TILE - 12, 6);
    });

    this.createTexture('pickup', (g) => {
      g.fillStyle('rgba(0, 0, 0, 0.6)', 1);
      g.fillRect(8, TILE - 10, TILE - 16, 8);
      g.fillStyle('#f2d45c', 1);
      g.beginPath();
      g.moveTo(TILE / 2, 4);
      g.lineTo(TILE - 6, TILE / 2);
      g.lineTo(TILE / 2, TILE - 6);
      g.lineTo(6, TILE / 2);
      g.closePath();
      g.fillPath();
    });

    this.createTexture('npc', (g) => {
      g.fillStyle('#87b0ff', 1);
      g.fillRect(6, 8, TILE - 12, TILE - 14);
      g.fillStyle('#2b2f48', 1);
      g.fillRect(6, TILE - 10, TILE - 12, 8);
      g.fillStyle('#1c2640', 1);
      g.fillRect(10, 6, TILE - 20, 4);
      g.fillStyle('#c1dbff', 1);
      g.fillRect(10, 12, TILE - 20, 6);
      g.fillStyle('#151824', 1);
      g.fillRect(12, TILE - 6, TILE / 2 - 8, 4);
      g.fillRect(TILE / 2 + 4, TILE - 6, TILE / 2 - 8, 4);
    });
  }

  createTexture(key, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  createLevel() {
    this.walls = this.physics.add.staticGroup();
    const rt = this.add.renderTexture(0, 0, WORLD.width * TILE, WORLD.height * TILE);
    rt.setOrigin(0, 0);

    levelGrid.forEach((row, y) => {
      row.forEach((tile, x) => {
        const drawKey = tile === 1 ? 'wall' : 'floor';
        rt.draw(drawKey, x * TILE, y * TILE);
        if (tile === 1) {
          const wall = this.walls.create(x * TILE + TILE / 2, y * TILE + TILE / 2, 'wall');
          wall.setSize(TILE, TILE);
          wall.refreshBody();
        }
      });
    });
  }

  createPlayer() {
    const { playerStart } = demoLevel.actors;
    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'player');
    this.player.setDepth(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(22, 22);
    this.player.body.setOffset((TILE - 22) / 2, (TILE - 22) / 2);
    this.physics.add.collider(this.player, this.walls);
  }

  createPickups() {
    this.pickups = this.physics.add.staticGroup();

    demoLevel.pickups.forEach((pickup) => {
      const x = pickup.x ?? pickup.tx * TILE + TILE / 2;
      const y = pickup.y ?? pickup.ty * TILE + TILE / 2;
      const sprite = this.pickups.create(x, y, 'pickup');
      sprite.setData('pickup', pickup);
      sprite.setDepth(1);
      sprite.setCircle(12, (TILE - 24) / 2, (TILE - 24) / 2);
    });

    this.physics.add.overlap(this.player, this.pickups, (_player, sprite) => {
      this.collectPickup(sprite);
    });
  }

  createNpcs() {
    this.npcEntries = demoLevel.actors.npcs.map((npc) => {
      const x = npc.x ?? npc.tx * TILE + TILE / 2;
      const y = npc.y ?? npc.ty * TILE + TILE / 2;
      const sprite = this.add.sprite(x, y, 'npc');
      sprite.setDepth(2);
      const ring = this.add.graphics();
      ring.lineStyle(2, 0x5cf2cc, 0.6);
      ring.strokeCircle(x, y + 2, TILE / 2);
      ring.setVisible(false);
      ring.setDepth(1);
      return { ...npc, x, y, sprite, ring, nearby: false, hasSpoken: false };
    });
  }

  createCamera() {
    const camera = this.cameras.main;
    camera.setBackgroundColor('#0b0b10');
    camera.setBounds(0, 0, WORLD.width * TILE, WORLD.height * TILE);
    camera.startFollow(this.player, true, 0.15, 0.15);
  }

  registerInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E');

    this.input.keyboard.on('keydown-E', () => {
      this.interactRequested = true;
    });
  }

  updatePlayerMovement() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    const velocity = new Phaser.Math.Vector2(
      (left ? -1 : 0) + (right ? 1 : 0),
      (up ? -1 : 0) + (down ? 1 : 0),
    );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(140);
    }

    this.player.setVelocity(velocity.x, velocity.y);
  }

  updateNpcStates(delta) {
    let nearest = null;
    let nearestDistance = Infinity;

    this.npcEntries.forEach((entry) => {
      const dx = entry.x - this.player.x;
      const dy = entry.y - this.player.y;
      const distance = Math.hypot(dx, dy);
      entry.nearby = distance <= TALK_RADIUS;
      entry.ring.setVisible(entry.nearby);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = entry;
      }
    });

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
    if (sprite.getData('collected')) return;
    const pickup = sprite.getData('pickup');
    if (!pickup) return;

    const stored = inventory.addItem({
      id: pickup.id,
      name: pickup.name,
      icon: pickup.icon,
      tint: pickup.tint,
    });

    if (stored) {
      sprite.setData('collected', true);
      sprite.disableBody(true, true);
      renderInventory(inventory);
      updateInventoryNote(`Sebráno: ${pickup.name}`);
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  canvas: document.getElementById('game'),
  backgroundColor: '#0b0b10',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: DemoScene,
});

export default game;
