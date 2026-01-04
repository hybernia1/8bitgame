import { TILE } from '../../core/constants.js';
import { placeNpc } from '../npcs/index.js';
import { TILE_IDS } from '../../world/tile-registry.js';

const BASE_WIDTH = 16;
const {
  FLOOR_PLAIN: F,
  WALL_SOLID: W,
  DOOR_CLOSED: D,
  DOOR_OPEN: DO,
  WALL_WINDOW: WW,
  WALL_CRACKED: WC,
  FLOOR_LIT: FL,
} = TILE_IDS;

const baseLayout = [
  W, W, W, WW, W, W, W, W, W, W, W, W, WW, W, W, W,
  W, F, FL, FL, FL, F, F, F, F, F, F, F, F, F, F, W,
  W, F, F, W, W, W, F, F, F, W, W, W, F, F, F, W,
  W, F, F, W, F, F, F, F, F, WC, F, F, F, F, F, W,
  W, F, F, W, F, F, W, F, F, W, F, F, W, F, F, W,
  W, F, F, F, F, F, W, FL, FL, F, F, F, F, F, F, W,
  W, F, F, W, W, W, F, F, F, W, W, W, F, F, F, W,
  W, F, F, F, F, FL, F, F, F, F, F, F, W, F, F, W,
  W, F, F, W, F, F, W, W, W, F, F, W, W, W, WC, W,
  W, F, FL, WC, F, F, F, F, F, F, FL, D, F, F, WC, W,
  W, F, F, F, F, F, FL, F, F, F, F, W, W, W, F, W,
  W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,
];
const layoutWithVcrRoom = [...baseLayout];
const toIndex = (x, y) => y * BASE_WIDTH + x;
layoutWithVcrRoom[toIndex(12, 10)] = F;
layoutWithVcrRoom[toIndex(13, 10)] = F;
const BASE_HEIGHT = baseLayout.length / BASE_WIDTH;

/** @type {import('../types.js').LevelConfig} */
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
    collision: [...layoutWithVcrRoom],
    collisionUnlocked: [...layoutWithVcrRoom],
    decor: [...layoutWithVcrRoom],
    decorUnlocked: [...layoutWithVcrRoom],
  },
  interactables: {
    pressureSwitches: [
      {
        id: 'storage-switch',
        name: 'Skladový spínač',
        tx: 9,
        ty: 8,
        targets: [{ tx: 11, ty: 9 }],
        openTile: DO,
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
      placeNpc('cat', 4, 3),
      {
        id: 'recording-cabinet',
        name: 'Záznamová skříň',
        sprite: 'decor.console',
        animationBase: 'decor.console',
        tx: 5,
        ty: 5,
        dialogue: 'Skříň se starými záznamy bliká zeleně.',
      },
      {
        id: 'vcr-player',
        name: 'Přehrávač',
        sprite: 'decor.console',
        animationBase: 'decor.console',
        tx: 13,
        ty: 10,
        dialogue: 'Starý přehrávač čeká na kazetu.',
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
  rewards: {
    'recording-cabinet-tape': {
      id: 'recording-cabinet-tape',
      actions: [
        {
          type: 'giveItem',
          item: { id: 'videotape', name: 'Videokazeta', icon: '📼', tint: '#f2d45c' },
          blockedDialogue: 'Nemáš místo v inventáři, uvolni si slot pro kazetu.',
          blockedNote: 'Kazetu nemáš kam uložit. Uvolni slot a otevři skříň znovu.',
        },
      ],
      note: 'note.videotape.found',
    },
  },
  quests: [],
  npcScripts: {
    cat: {
      defaultDialogue: 'Kočka se nechá podrbat na bříšku. *purr*',
    },
    'recording-cabinet': {
      defaultDialogue: 'Skříň je plná prázdných šuplíků.',
      lines: [
        {
          id: 'cabinet-tape',
          when: [{ flag: 'videoTapeCollected', equals: false }],
          dialogue: 'V útrobách skříně nacházíš videokazetu se štítkem. Přehrávač tu ale nevidíš.',
          rewardId: 'recording-cabinet-tape',
          setState: { videoTapeCollected: true },
          note: 'note.videotape.found',
        },
        {
          id: 'cabinet-empty',
          when: [{ flag: 'videoTapeCollected', equals: true }],
          dialogue: 'Skříň už je prázdná. Přehrávač musí být jinde.',
        },
      ],
    },
    'vcr-player': {
      defaultDialogue: 'Bez kazety přehrávač nepomůže.',
      lines: [
        {
          id: 'vcr-play',
          when: [{ hasItem: 'videotape' }],
          dialogue: 'Vkládáš kazetu. Přístroj se rozbliká a začne přehrávat šum a tichý hlas.',
          actions: [
            {
              type: 'consumeItem',
              item: 'videotape',
              quantity: 1,
              blockedDialogue: 'Kazetu nemáš, přehrávač jen tiše pípá.',
              blockedNote: 'Chybí videokazeta.',
            },
            { type: 'setFlag', flag: 'videoTapePlayed', value: true },
          ],
          note: 'note.videotape.played',
        },
        {
          id: 'vcr-after',
          when: [{ flag: 'videoTapePlayed', equals: true }],
          dialogue: 'Kazeta dohrála. Přehrávač jen tiše hučí.',
        },
      ],
    },
  },
};
