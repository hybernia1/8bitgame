import { TILE } from '../../core/constants.js';
import { TILE_IDS } from '../../world/tile-registry.js';

const { FLOOR_PLAIN: F, WALL_SOLID: W, WALL_WINDOW: WW, FLOOR_LIT: FL } = TILE_IDS;

const BASE_WIDTH = 12;
const baseLayout = [
  W, W, W, W, W, W, W, W, W, W, W, W,
  W, F, FL, FL, WW, F, F, F, FL, F, F, W,
  W, F, F, F, F, F, W, F, F, FL, F, W,
  W, F, F, W, W, F, F, F, W, F, F, W,
  W, F, F, W, FL, F, F, F, W, FL, F, W,
  W, F, F, W, W, W, F, FL, W, F, F, W,
  W, F, F, F, F, F, F, F, F, F, F, W,
  W, F, FL, F, W, F, F, FL, F, W, F, W,
  W, W, W, W, W, W, W, W, W, W, W, W,
];
const BASE_HEIGHT = baseLayout.length / BASE_WIDTH;

/** @type {import('../types.js').LevelConfig} */
export const rooftopCorridorLevel = {
  meta: {
    id: 'level-3',
    name: 'Úniková Chodba',
    title: 'Úniková Chodba',
    subtitle: 'Krátký dech před dalším krokem',
    levelNumber: 3,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout],
    decor: [...baseLayout],
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: 4, h: 3 }],
    switches: [
      {
        id: 'corridor-switch',
        name: 'Předsíň',
        tx: 6,
        ty: 6,
        lights: [
          { x: 2, y: 4, w: 8, h: 3 },
          { x: 5, y: 6, w: 5, h: 2 },
        ],
      },
      {
        id: 'observation-switch',
        name: 'Pozorovací okno',
        tx: 3,
        ty: 2,
        lights: [
          { x: 1, y: 1, w: 6, h: 3 },
          { x: 0, y: 0, w: 4, h: 2 },
        ],
      },
    ],
  },
  interactables: {},
  actors: {
    playerStart: { x: TILE * 2.5, y: TILE * 6.5 },
    monsters: [],
    props: [
      {
        id: 'observation-console',
        name: 'Pozorovací konzole',
        sprite: 'decor.console',
        animationBase: 'decor.console',
        tx: 4,
        ty: 2,
        dialogue: 'Terminál tiše bliká a ukazuje mapu dalšího křídla.',
      },
    ],
    npcs: [],
  },
  pickups: [],
  rewards: {},
  quests: [],
  npcScripts: {},
};
