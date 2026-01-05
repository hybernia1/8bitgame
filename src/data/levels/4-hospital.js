import { TILE } from '../../core/constants.js';
import { TILE_IDS } from '../../world/tile-registry.js';

const { FLOOR_PLAIN: F, WALL_SOLID: W, FLOOR_LIT: FL } = TILE_IDS;

const BASE_WIDTH = 10;
const baseLayout = [
  W, W, W, W, W, W, W, W, W, W,
  W, FL, F, F, FL, F, F, F, FL, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, FL, F, FL, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, FL, F, F, FL, F, F, F, FL, W,
  W, F, F, F, F, F, F, F, F, W,
  W, W, W, W, W, W, W, W, W, W,
];
const BASE_HEIGHT = baseLayout.length / BASE_WIDTH;

/** @type {import('../types.js').LevelConfig} */
export const hospitalLevel = {
  meta: {
    id: 'level-4',
    name: 'Nemocnice',
    title: 'Nemocnice',
    subtitle: 'Probouzení v neonovém světle',
    levelNumber: 4,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout],
    decor: [...baseLayout],
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: BASE_WIDTH - 2, h: BASE_HEIGHT - 2 }],
    switches: [],
  },
  interactables: {},
  actors: {
    playerStart: { x: TILE * 4.5, y: TILE * 3.5 },
    monsters: [],
    props: [],
    npcs: [],
  },
  pickups: [],
  rewards: {},
  quests: [],
  npcScripts: {},
};

export const dialogues = {};
export const quests = [];

export default {
  config: hospitalLevel,
  dialogues,
  quests,
};
