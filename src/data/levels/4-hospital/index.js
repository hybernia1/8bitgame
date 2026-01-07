import { TILE } from '../../../core/constants.js';
import { getPickupPreset } from '../../pickups/index.js';
import { buildTileLayersFromTokens } from '../map-utils.js';
import { hospitalNpcPackage } from './npcs.js';

const BASE_WIDTH = 10;
const baseLayoutTokens = [
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
  'W1', 'F1', 'F2', 'F2', 'F1', 'F2', 'F2', 'F2', 'F1', 'W1',
  'W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1',
  'W1', 'F2', 'F2', 'F1', 'F2', 'F1', 'F2', 'F2', 'F2', 'W1',
  'W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1',
  'W1', 'F1', 'F2', 'F2', 'F1', 'F2', 'F2', 'F2', 'F1', 'W1',
  'W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1',
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
];
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const BASE_HEIGHT = baseLayout.collision.length / BASE_WIDTH;

/** @type {import('../../types.js').LevelConfig} */
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
    collision: [...baseLayout.collision],
    decor: [...baseLayout.decor],
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: BASE_WIDTH - 2, h: BASE_HEIGHT - 2 }],
    switches: [],
  },
  interactables: {
    safes: [
      {
        id: 'demo-safe',
        name: 'Nemocniční sejf',
        tx: 7,
        ty: 2,
        code: '0000',
        codeLength: 4,
        reward: getPickupPreset('apple'),
        rewardNote: 'note.safe.itemReceived',
        emptyNote: 'note.safe.empty',
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * 4.5, y: TILE * 3.5 },
    monsters: [],
    props: [],
    npcs: [...hospitalNpcPackage.placements],
  },
  pickups: [],
  rewards: hospitalNpcPackage.rewards,
  quests: [
    {
      id: 'talk-to-mayor',
      type: 'escort',
      name: 'Promluv se starostkou Hanou',
      description: 'Prober se na nemocničním lůžku a zjisti od Hany, co se stalo.',
      completedFlag: 'hospitalSpokeWithMayor',
    },
    {
      id: 'talk-to-doctor',
      type: 'escort',
      name: 'Promluv se s lékařem',
      description: 'Vyhledej doktora Viktora a nech si zkontrolovat stav i zvláštní vzpomínky.',
      completedFlag: 'hospitalSpokeWithDoctor',
    },
  ],
  npcScripts: hospitalNpcPackage.scripts,
};

export const dialogues = hospitalNpcPackage.scripts;
export const quests = hospitalLevel.quests;

export default {
  config: hospitalLevel,
  dialogues,
  quests,
};
