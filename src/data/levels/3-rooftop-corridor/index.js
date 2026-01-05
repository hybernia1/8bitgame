import { TILE } from '../../../core/constants.js';
import { TILE_IDS } from '../../../world/tile-registry.js';

const { FLOOR_PLAIN: F, WALL_SOLID: W, FLOOR_LIT: FL } = TILE_IDS;

const BASE_WIDTH = 9;
const baseLayout = [
  W, W, W, W, W, W, W, W, W,
  W, FL, F, F, F, F, F, FL, W,
  W, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, W,
  W, F, F, F, FL, F, F, F, W,
  W, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, W,
  W, FL, F, F, F, F, F, FL, W,
  W, W, W, W, W, W, W, W, W,
];
const BASE_HEIGHT = baseLayout.length / BASE_WIDTH;

/** @type {import('../../types.js').LevelConfig} */
export const rooftopCorridorLevel = {
  meta: {
    id: 'level-3',
    name: 'Úniková Chodba',
    title: 'Úniková Chodba',
    subtitle: 'V pasti ozvěn',
    levelNumber: 3,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout],
    decor: [...baseLayout],
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: 7, h: 7 }],
    switches: [],
  },
  interactables: {},
  actors: {
    playerStart: { x: TILE * 4.5, y: TILE * 4.5 },
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
  config: rooftopCorridorLevel,
  dialogues,
  quests,
};
