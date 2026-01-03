import { TILE } from '../core/constants.js';
import { WIDESCREEN_DIMENSIONS, padLayer } from './layout-utils.js';

const BASE_WIDTH = 16;
const { width: TARGET_WIDTH, height: TARGET_HEIGHT } = WIDESCREEN_DIMENSIONS;

const baseLayout = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1,
  1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1,
  1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
  1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

/** @type {import('./types.js').LevelConfig} */
export const levelOne = {
  meta: {
    id: 'level-1',
    name: 'Servisní Křídlo',
    title: 'Servisní Křídlo',
    subtitle: 'hud.controls',
    levelNumber: 1,
  },
  width: TARGET_WIDTH,
  height: TARGET_HEIGHT,
  tileLayers: {
    collision: padLayer(baseLayout, BASE_WIDTH),
    collisionUnlocked: padLayer(baseLayout, BASE_WIDTH),
    decor: padLayer(baseLayout, BASE_WIDTH),
    decorUnlocked: padLayer(baseLayout, BASE_WIDTH),
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: 14, h: 10 }],
  },
  actors: {
    playerStart: { x: TILE * 2.5, y: TILE * 2.5 },
    monsters: [],
    props: [],
    npcs: [
      {
        id: 'overseer',
        name: 'Dozorčí',
        tx: 8,
        ty: 5,
        dialogue: 'Vítej v servisním křídle. Prozkoumej sklad a připrav se na další výpravu.',
      },
    ],
  },
  pickups: [
    {
      id: 'ammo',
      name: 'Náboje',
      icon: '•',
      x: TILE * 6 + TILE / 2,
      y: TILE * 3 + TILE / 2,
      tint: '#f28f5c',
      stackable: true,
      quantity: 6,
      objective: false,
    },
    {
      id: 'ammo',
      name: 'Náboje',
      icon: '•',
      x: TILE * 9 + TILE / 2,
      y: TILE * 8 + TILE / 2,
      tint: '#f28f5c',
      stackable: true,
      quantity: 6,
      objective: false,
    },
    {
      id: 'apple',
      name: 'Jablko',
      icon: '🍎',
      x: TILE * 4 + TILE / 2,
      y: TILE * 9 + TILE / 2,
      tint: '#f25c5c',
      objective: false,
    },
  ],
  rewards: {},
  quests: [],
};
