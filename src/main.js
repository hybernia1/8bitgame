import { init, initKeys } from './kontra.mjs';
import { CANVAS_RESOLUTION } from './core/constants.js';
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
  baseCanvas: CANVAS_RESOLUTION,
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
