import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens } from '../map-utils.js';

const BASE_WIDTH = 9;
const baseLayoutRows = [
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
  ['W1', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F2', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'W1'],
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
];
const baseLayoutTokens = baseLayoutRows.flat();
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const BASE_HEIGHT = baseLayout.collision.length / BASE_WIDTH;

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
    collision: [...baseLayout.collision],
    decor: [...baseLayout.decor],
    destroyedFloors: [...baseLayout.destroyedFloors],
  },
  lighting: {
    sources: [{ tx: 4, ty: 4 }],
    switches: [],
  },
  interactables: {},
  actors: {
    playerStart: { x: TILE * 4.5, y: TILE * 4.5 },
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
