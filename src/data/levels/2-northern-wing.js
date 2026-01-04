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
  W, W, W, WW, W, W, W, W, D, W, W, W, WW, W, W, W,
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
    gate: {
      id: 'north-gate',
      tx: 8,
      ty: 0,
      locked: true,
      openTile: DO,
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
      {
        id: 'spider-1',
        name: 'Pavouk',
        sprite: 'spider',
        tx: 9,
        ty: 8,
        lethal: true,
        wanderRadius: TILE * 4,
        wanderInterval: 1.4,
      },
      {
        id: 'spider-2',
        name: 'Pavouk',
        sprite: 'spider',
        tx: 12,
        ty: 6,
        lethal: true,
        wanderRadius: TILE * 5,
        wanderInterval: 1.2,
      },
      {
        id: 'spider-3',
        name: 'Pavouk',
        sprite: 'spider',
        tx: 6,
        ty: 9,
        lethal: true,
        wanderRadius: TILE * 3,
        wanderInterval: 1,
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
    'cat-collar-key': {
      id: 'cat-collar-key',
      actions: [
        {
          type: 'giveItem',
          item: { id: 'collar-key', name: 'Klíček z obojku', icon: '🗝️', tint: '#f2d45c' },
          blockedDialogue: 'Bez volného slotu si klíček z obojku nevezmeš.',
          blockedNote: 'Uvolni slot, ať můžeš vzít klíček z kočičího obojku.',
        },
        { type: 'unlock', targetId: 'north-gate' },
        { type: 'setFlag', flag: 'northGateUnlocked', value: true },
        { type: 'setArea', name: 'Únikový koridor' },
        { type: 'setLevelNumber', value: 3 },
      ],
      note: 'Našel jsi klíček na kočičím obojku. Severní dveře by se měly odjistit.',
    },
  },
  quests: [],
  npcScripts: {
    cat: {
      defaultDialogue: 'Kočka se nechá podrbat na bříšku. *purr*',
      lines: [
        {
          id: 'cat-awaiting-vcr',
          when: [
            { flag: 'videoTapePlayed', equals: false },
            { flag: 'catCollarKeyFound', equals: false },
          ],
          dialogue: 'Ještě tě pomazlím, ale nejdříve si musím projít záznamy z kamer.',
        },
        {
          id: 'cat-collar-key',
          when: [
            { flag: 'videoTapePlayed', equals: true },
            { flag: 'catCollarKeyFound', equals: false },
          ],
          dialogue:
            'Podrbeš kočku a na obojku zahlédneš malý klíček. Kočka ti nastaví hlavu a klíček ti nechá.',
          rewardId: 'cat-collar-key',
          actions: [{ type: 'setFlag', flag: 'catCollarKeyFound', value: true }],
          note: 'Klíček z kočičího obojku získán.',
        },
        {
          id: 'cat-thanks',
          when: [
            { flag: 'catCollarKeyFound', equals: true },
            { flag: 'catThanked', equals: false },
          ],
          dialogue:
            'Díky za klíček, kočičko. Mám doma čtyři kočky – poznám, kdy někdo nosí poklad! Kočka ti olízne ruku a spokojeně přede.',
          actions: [{ type: 'setFlag', flag: 'catThanked', value: true }],
        },
        {
          id: 'cat-purr',
          dialogue: 'Kočka se otře o tvoji nohu a olízne ti ruku.',
        },
      ],
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
          dialogue:
            'Vkládáš kazetu. Přístroj jen zabliká a přehraje prázdný šum – technik Jára tě sem poslal zbytečně.',
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
          dialogue: 'Kazeta byla prázdná. Přehrávač jen tiše hučí.',
        },
      ],
    },
  },
};
