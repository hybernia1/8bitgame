import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens, resolveTileToken } from '../map-utils.js';
import { northernWingNpcPackage } from './npcs.js';

const BASE_WIDTH = 16;

const baseLayoutTokens = [
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'DOOR', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
  'W1', 'F1', 'F2', 'F2', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1D1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F2', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1D1', 'W1',
  'W1', 'F1', 'F2', 'W1D1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'DOOR', 'F1', 'F1', 'W1D1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1',
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
];
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const layoutWithVcrRoom = {
  collision: [...baseLayout.collision],
  decor: [...baseLayout.decor],
};
const toIndex = (x, y) => y * BASE_WIDTH + x;
layoutWithVcrRoom.collision[toIndex(12, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.collision[toIndex(13, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.decor[toIndex(12, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.decor[toIndex(13, 10)] = resolveTileToken('F1');
const BASE_HEIGHT = baseLayout.collision.length / BASE_WIDTH;
const DOOR_OPEN_TILE = resolveTileToken('DOOR_OPEN');
const DOOR_CLOSED_TILE = resolveTileToken('DOOR');

/** @type {import('../../types.js').LevelConfig} */
export const northernWingLevel = {
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
    collision: [...layoutWithVcrRoom.collision],
    decor: [...layoutWithVcrRoom.decor],
  },
  interactables: {
    pressureSwitches: [
      {
        id: 'storage-switch',
        name: 'Skladový spínač',
        tx: 9,
        ty: 8,
        targets: [{ tx: 11, ty: 9 }],
        openTile: DOOR_OPEN_TILE,
        closedTile: DOOR_CLOSED_TILE,
      },
    ],
    gate: {
      id: 'north-gate',
      tx: 8,
      ty: 0,
      locked: true,
      openTile: DOOR_OPEN_TILE,
      nextLevelId: 'level-3',
      promptLocked: 'Dveře drží maličký klíček z obojku.',
      promptUnlocked: 'Dveře jsou odjistěné, projdi dál.',
      speaker: 'systém dveří',
      unlockLine: 'Zámek cvakne a dveře k severnímu východu povolí.',
      consumeNote: 'Klíček zůstal v zámku, dál už ho nepotřebuješ.',
      requiredItemId: 'collar-key',
      consumeFlag: 'catCollarKeyUsed',
    },
  },
  lighting: {
    litZones: [
      { x: 1, y: 1, w: 5, h: 4 },
      { x: 8, y: 6, w: 4, h: 3 },
    ],
    switches: [
      {
        id: 'hall-switch',
        name: 'Chodba',
        tx: 4,
        ty: 1,
        lights: [{ x: 1, y: 1, w: 7, h: 5 }],
      },
      {
        id: 'storage-switch',
        name: 'Sklad',
        tx: 12,
        ty: 5,
        lights: [
          { x: 9, y: 4, w: 5, h: 4 },
          { x: 12, y: 8, w: 3, h: 2 },
        ],
      },
      {
        id: 'lab-switch',
        name: 'Laboratoř',
        tx: 10,
        ty: 9,
        lights: [{ x: 6, y: 8, w: 6, h: 3 }],
      },
      {
        id: 'atrium-switch',
        name: 'Chodba ke skladu',
        tx: 2,
        ty: 7,
        lights: [
          { x: 1, y: 6, w: 6, h: 4 },
          { x: 0, y: 9, w: 8, h: 2 },
        ],
      },
      {
        id: 'north-exit-switch',
        name: 'Severní východ',
        tx: 13,
        ty: 1,
        lights: [
          { x: 6, y: 0, w: 5, h: 3 },
          { x: 9, y: 1, w: 6, h: 3 },
        ],
      },
    ],
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
    npcs: [...northernWingNpcPackage.placements],
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
  npcScripts: northernWingNpcPackage.scripts,
  rewards: northernWingNpcPackage.rewards,
  quests: [
    {
      id: 'play-security-footage',
      type: 'escort',
      name: 'Přehraj záznamy z kamer',
      description: 'Najdi videokazetu a přehraj ji v přehrávači, ať víš, co se v severním křídle stalo.',
      completedFlag: 'videoTapePlayed',
      objectiveCount: 1,
      completionNote: '[Úkol splněn] Kazeta je prázdná. Odsaď musíš pryč.',
    },
    {
      id: 'escape-northern-wing',
      type: 'escort',
      name: 'Dostaň se pryč',
      description: 'Kazeta ti nic neřekla. Získej klíček a proklouzni severním východem do dalšího křídla.',
      completedFlag: 'northWingExited',
      objectiveCount: 1,
      completionNote: '[Úkol splněn] Opouštíš severní křídlo. Únikový koridor je na dosah.',
    },
  ],
};

export const dialogues = northernWingNpcPackage.scripts;
export const quests = northernWingLevel.quests;

export default {
  config: northernWingLevel,
  dialogues,
  quests,
};
