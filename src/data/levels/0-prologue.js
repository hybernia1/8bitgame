import { TILE } from '../../core/constants.js';
import { TILE_IDS } from '../../world/tile-registry.js';

const { FLOOR_PLAIN: F, WALL_SOLID: W } = TILE_IDS;
const WIDTH = 10;
const HEIGHT = 8;

/** @type {number[]} */
const layout = [
  W, W, W, W, W, W, W, W, W, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, F, F, F, F, F, F, F, F, W,
  W, W, W, W, W, W, W, W, W, W,
];

export const prologueLevel = {
  meta: {
    id: 'level-0-prologue',
    name: 'Prolog',
    title: 'Prolog: telefonát',
    subtitle: 'Úvod do pátrání',
    levelNumber: 0,
    dimensions: { width: WIDTH, height: HEIGHT },
  },
  dimensions: { width: WIDTH, height: HEIGHT },
  tileLayers: {
    collision: [...layout],
    decor: [...layout],
  },
  lighting: {
    litZones: [
      {
        x: 0,
        y: 0,
        w: WIDTH,
        h: HEIGHT,
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * 5, y: TILE * 4 },
    monsters: [],
    props: [],
    npcs: [],
  },
  pickups: [],
  npcScripts: {},
  quests: [],
};

export default prologueLevel;
