import { init, initKeys } from './kontra.mjs';
import { TILE, WORLD } from './core/constants.js';
import { getCurrentScene } from './core/scenes.js';
import { createGame } from './core/game.js';
import { createGameLoop } from './systems/game-loop.js';
import { createSessionSystem } from './systems/session.js';
import { loadSpriteSheet } from './core/sprites.js';
import { Inventory } from './ui/inventory.js';
import { initShell } from './ui/app-shell.js';

const { canvas, context: ctx } = init('game');
initKeys();

const shell = initShell({
  canvas,
  baseCanvas: { width: WORLD.width * TILE, height: WORLD.height * TILE },
});

const inventory = new Inventory(12);
const game = createGame({ inventory });
const spriteSheetPromise = loadSpriteSheet();

const session = createSessionSystem({
  canvas,
  ctx,
  game,
  inventory,
  spriteSheetPromise,
  shell,
});

const loop = createGameLoop({
  getScene: getCurrentScene,
});
loop.start();

session.start();
