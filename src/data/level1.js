import { TILE } from '../core/constants.js';
import { TILE_IDS } from '../world/tile-registry.js';

const BASE_WIDTH = 16;
const { FLOOR_PLAIN: F, WALL_SOLID: W, DOOR_CLOSED: D, WALL_WINDOW: WW, WALL_CRACKED: WC, FLOOR_LIT: FL } = TILE_IDS;

const baseLayout = [
  W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,
  W, F, FL, FL, FL, F, F, F, F, F, F, F, F, F, F, W,
  W, F, F, WW, W, W, F, F, F, W, WW, W, F, F, F, W,
  W, F, F, W, F, F, F, F, F, WC, F, F, F, F, F, W,
  W, F, F, W, F, F, WW, F, F, W, F, F, W, F, F, W,
  W, F, F, F, F, F, W, FL, FL, F, F, F, F, F, F, W,
  W, F, F, W, W, W, F, F, F, W, W, W, F, F, F, W,
  W, F, F, F, F, FL, F, F, F, F, F, F, WW, F, F, W,
  W, F, F, W, F, F, W, W, W, F, F, WW, W, W, WC, W,
  W, F, FL, WC, F, F, F, F, F, F, FL, D, F, F, WC, W,
  W, F, F, F, F, F, FL, F, F, F, F, W, W, W, F, W,
  W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,
];
const BASE_HEIGHT = baseLayout.length / BASE_WIDTH;

/** @type {import('./types.js').LevelConfig} */
export const levelOne = {
  meta: {
    id: 'level-2',
    name: 'Severní Křídlo Laboratoře',
    title: 'Severní Křídlo Laboratoře',
    subtitle: 'hud.controls',
    levelNumber: 2,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout],
    collisionUnlocked: [...baseLayout],
    decor: [...baseLayout],
    decorUnlocked: [...baseLayout],
  },
  interactables: {
    pressureSwitches: [
      {
        id: 'storage-switch',
        name: 'Skladový spínač',
        tx: 9,
        ty: 8,
        targets: [{ tx: 11, ty: 9 }],
        openTile: F,
        closedTile: D,
      },
    ],
  },
  lighting: {
    litZones: [{ x: 1, y: 1, w: 14, h: 10 }],
  },
  actors: {
    playerStart: { x: TILE * 2.5, y: TILE * 2.5 },
    monsters: [],
    props: [
      {
        id: 'crate-1',
        name: 'Krabice',
        tx: 7,
        ty: 5,
        pushable: true,
      },
    ],
    npcs: [
      {
        id: 'overseer',
        name: 'Dozorčí',
        tx: 8,
        ty: 5,
        dialogue: 'Vítej v servisním křídle. Prozkoumej sklad a připrav se na další výpravu.',
      },
      {
        id: 'cat',
        name: 'Kočka',
        sprite: 'cat',
        tx: 4,
        ty: 3,
        speed: 28,
        wanderRadius: TILE * 3,
        wanderInterval: 0.8,
        dialogue: 'Podrbat na bříšku! *prrr*',
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
      storeInInventory: false,
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
      storeInInventory: false,
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
    {
      id: 'ammo',
      name: 'Náboje',
      icon: '•',
      x: TILE * 13 + TILE / 2,
      y: TILE * 9 + TILE / 2,
      tint: '#f28f5c',
      stackable: true,
      storeInInventory: false,
      quantity: 8,
      objective: false,
    },
  ],
  rewards: {},
  quests: [],
  npcScripts: {
    cat: {
      defaultDialogue: 'Kočka se nechá podrbat na bříšku. *purr*',
    },
  },
};
