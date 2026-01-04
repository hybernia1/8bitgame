import { TILE } from '../core/constants.js';
import { WIDESCREEN_DIMENSIONS, padLayer } from './layout-utils.js';
import { TILE_IDS } from '../world/tile-registry.js';

const BASE_WIDTH = 20;
const BASE_HEIGHT = 15;
const { width: TARGET_WIDTH, height: TARGET_HEIGHT } = WIDESCREEN_DIMENSIONS;
const { FLOOR_PLAIN: F, WALL_SOLID: W, DOOR_CLOSED: D, WALL_WINDOW: WW, WALL_CRACKED: WC, FLOOR_LIT: FL } = TILE_IDS;

const baseSwitches = [
  {
    id: 'entry-switch',
    name: 'Vstupní vypínač',
    tx: 5,
    ty: 2,
    lights: [
      {
        x: 1,
        y: 1,
        w: 10,
        h: 7,
      },
    ],
  },
  {
    id: 'storage-switch',
    name: 'Skladový vypínač',
    tx: 13,
    ty: 5,
    lights: [
      {
        x: 9,
        y: 4,
        w: 7,
        h: 7,
      },
    ],
  },
  {
    id: 'lab-switch',
    name: 'Laboratorní vypínač',
    tx: 17,
    ty: 9,
    lights: [
      {
        x: 13,
        y: 7,
        w: 6,
        h: 6,
      },
    ],
  },
];

/** @type {import('./types.js').LevelConfig} */
const baseMap = [
  W, WC, W, W, W, WW, W, W, W, W, W, W, W, W, WW, W, W, W, W, W,
  W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W,
  W, F, FL, FL, FL, W, W, W, W, F, F, F, F, W, F, F, F, F, F, W,
  W, F, F, F, F, WW, F, F, W, F, F, F, F, W, F, W, W, WC, F, W,
  W, F, F, F, F, W, F, F, W, F, F, F, F, W, F, F, F, W, F, W,
  W, F, F, F, F, W, F, F, W, FL, FL, F, F, WW, W, W, F, W, F, W,
  W, F, F, F, F, W, F, F, W, F, F, F, F, FL, F, F, F, W, F, W,
  W, F, F, F, F, W, F, F, WW, W, W, F, F, F, F, WC, F, W, F, W,
  W, F, F, F, F, W, F, F, F, F, W, FL, FL, W, F, W, F, F, F, W,
  W, F, F, F, F, W, FL, F, F, F, W, F, F, W, W, W, W, W, F, W,
  W, F, F, F, F, W, F, F, F, F, F, F, F, W, D, W, W, W, F, W,
  W, F, F, F, F, W, F, W, W, W, W, W, F, W, F, W, W, W, F, W,
  W, F, F, F, F, F, F, F, F, F, F, W, F, F, F, W, W, WC, F, W,
  W, F, F, F, F, W, W, W, W, W, F, W, F, F, F, W, F, F, F, W,
  W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,
];

const unlockedMap = [
  W, WC, W, W, W, WW, W, W, W, W, W, W, W, W, WW, W, W, W, W, W,
  W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W,
  W, F, FL, FL, FL, W, W, W, W, F, F, F, F, W, F, F, F, F, F, W,
  W, F, F, F, F, WW, F, F, W, F, F, F, F, W, F, W, W, WC, F, W,
  W, F, F, F, F, W, F, F, W, F, F, F, F, W, F, F, F, W, F, W,
  W, F, F, F, F, W, F, F, W, FL, FL, F, F, WW, W, W, F, W, F, W,
  W, F, F, F, F, W, F, F, W, F, F, F, F, FL, F, F, F, W, F, W,
  W, F, F, F, F, W, F, F, WW, W, W, F, F, F, F, WC, F, W, F, W,
  W, F, F, F, F, W, F, F, F, F, W, FL, FL, W, F, W, F, W, F, W,
  W, F, F, F, F, W, FL, F, F, F, W, F, F, W, F, W, F, W, F, W,
  W, F, F, F, F, W, F, F, F, F, F, F, F, W, F, W, F, W, F, W,
  W, F, F, F, F, W, F, W, W, W, W, W, F, W, F, W, F, W, F, W,
  W, F, F, F, F, F, F, F, F, F, F, W, F, F, F, W, F, WC, F, W,
  W, F, F, F, F, W, W, W, W, W, F, W, F, F, F, W, F, F, F, W,
  W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,
];

export const demoLevel = {
  meta: {
    id: 'demo-facility',
    name: 'Demo Facility',
    title: 'Demo Facility',
    subtitle: 'hud.controls',
    levelNumber: 0,
  },
  width: TARGET_WIDTH,
  height: TARGET_HEIGHT,
  // Locked layout (what the player sees on load).
  map: padLayer(baseMap, BASE_WIDTH),
  // Layout after unlocking the gate. Used to restore the intended shape once the
  // player receives the key.
  unlockedMap: padLayer(unlockedMap, BASE_WIDTH),
  tileLayers: {
    collision: padLayer(baseMap, BASE_WIDTH),
    collisionUnlocked: padLayer(unlockedMap, BASE_WIDTH),
    decor: padLayer(baseMap, BASE_WIDTH),
    decorUnlocked: padLayer(unlockedMap, BASE_WIDTH),
  },
  lighting: {
    litZones: [
      {
        x: 1,
        y: 1,
        w: 5,
        h: 4,
      },
    ],
    switches: baseSwitches,
  },
  interactables: {
    switches: baseSwitches,
    gate: {
      id: 'main-gate',
      tx: 14,
      ty: 10,
      locked: true,
      openTile: F,
      nextLevelId: 'level-1',
      sealedTiles: [
        [14, 9],
        [15, 9],
        [16, 9],
        [15, 10],
        [16, 10],
        [17, 10],
        [15, 11],
        [16, 11],
        [17, 11],
        [15, 12],
        [16, 12],
        [17, 12],
      ],
      promptLocked: 'prompt.gateLocked',
      promptUnlocked: 'prompt.gateUnlocked',
      speaker: 'speaker.gateSystem',
      unlockLine: 'dialogue.gateUnlocked',
      consumeNote: 'note.gate.consumeKey',
    },
  },
  actors: {
    playerStart: { x: TILE * 2.5, y: TILE * 2.5 },
    monsters: [],
    props: [],
    npcs: [
      {
        id: 'caretaker',
        name: 'Správce Laboratoře',
        tx: 10,
        ty: 4,
        dialogue: 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.',
      },
      {
        id: 'technician',
        name: 'Technik Jára',
        tx: 6,
        ty: 9,
        dialogue: 'Hej, slyšel jsem šumění u zadního skladu. Možná tam něco blýská.',
        info: 'Technik Jára ti pošeptal: "V rohu skladiště u zdi zůstal energoblok, zkus ho vzít."',
      },
      {
        id: 'key-guard',
        name: 'Hlídač Klíče',
        tx: 18,
        ty: 11,
        sprite: 'monster',
        dialogue: 'Stůj! Klíč tady nikdo neukradne.',
        patrol: [
          { tx: 18, ty: 1 },
          { tx: 18, ty: 12 },
        ],
        speed: 50,
        lethal: true,
        health: 3,
      },
    ],
  },
  pickups: [
    {
      id: 'battery-cell',
      name: 'Battery Cell',
      icon: '⚡',
      x: TILE * 9 + TILE / 2,
      y: TILE * 6 + TILE / 2,
      tint: '#f2d45c',
      description: 'A humming power source for the lab lights.',
      objective: true,
    },
    {
      id: 'wrench',
      name: 'Service Wrench',
      icon: '🔧',
      x: TILE * 12 + TILE / 2,
      y: TILE * 9 + TILE / 2,
      tint: '#8ce0ff',
      description: 'Useful for tightening mech armor plating.',
      objective: true,
    },
    {
      id: 'keycard',
      name: 'Keycard Fragment',
      icon: '🗝️',
      x: TILE * 18 + TILE / 2,
      y: TILE * 12 + TILE / 2,
      tint: '#c66bff',
      description: 'One part of an access card. Collect the rest later.',
      objective: true,
    },
    {
      id: 'ammo',
      name: 'Náboje',
      icon: '•',
      x: TILE * 4 + TILE / 2,
      y: TILE * 4 + TILE / 2,
      tint: '#f28f5c',
      description: 'Munice pro tvoji pistoli.',
      objective: false,
      stackable: true,
      storeInInventory: false,
      quantity: 6,
    },
    {
      id: 'ammo',
      name: 'Náboje',
      icon: '•',
      x: TILE * 16 + TILE / 2,
      y: TILE * 8 + TILE / 2,
      tint: '#f28f5c',
      description: 'Munice pro tvoji pistoli.',
      objective: false,
      stackable: true,
      storeInInventory: false,
      quantity: 6,
    },
  ],
  rewards: {
    'caretaker-apple': {
      id: 'caretaker-apple',
      actions: [
        {
          type: 'giveItem',
          item: { id: 'apple', name: 'Jablko', icon: '🍎', tint: '#f25c5c' },
          blockedDialogue: 'Inventář máš plný, uvolni si místo, ať ti můžu dát jablko.',
          blockedNote: 'Nemáš místo na jablko. Uvolni slot a promluv si se Správcem znovu.',
        },
      ],
      note: 'Správce ti předal jablko. Použij číslo slotu (1-6) nebo klikni na slot pro doplnění jednoho života.',
    },
    'technician-gate-key': {
      id: 'technician-gate-key',
      actions: [
        {
          type: 'giveItem',
          item: { id: 'gate-key', name: 'Klíč od dveří', icon: '🔑', tint: '#f2d45c' },
          blockedDialogue: 'Tvůj inventář je plný, uvolni si místo na klíč.',
        },
        { type: 'unlock', targetId: 'gate' },
        { type: 'clearObjectives' },
        { type: 'setArea', name: 'Nové servisní křídlo' },
        { type: 'setLevelNumber', value: 1 },
      ],
      note: 'Klíč získán! Východní dveře se odemkly a mapa se rozšířila.',
    },
  },
};
