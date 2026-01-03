import { TILE } from '../core/constants.js';

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
  width: 16,
  height: 12,
  tileLayers: {
    collision: baseLayout,
    collisionUnlocked: baseLayout,
    decor: baseLayout,
    decorUnlocked: baseLayout,
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
