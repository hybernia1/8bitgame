import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens, resolveTileToken } from '../map-utils.js';
import { getItem, placePickup } from '../../items/index.js';
import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

const BASE_WIDTH = 16;

const baseLayoutRows = [
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'DR', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
  ['W1', 'F1', 'F2', 'F2', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1D1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F2', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F2', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1D1', 'W1'],
  ['W1', 'F1', 'F2', 'W1D1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'DR', 'F1', 'F1', 'W1D1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F2', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1'],
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
];
const baseLayoutTokens = baseLayoutRows.flat();
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const layoutWithVcrRoom = {
  collision: [...baseLayout.collision],
  decor: [...baseLayout.decor],
  destroyedFloors: [...baseLayout.destroyedFloors],
};
const toIndex = (x, y) => y * BASE_WIDTH + x;
layoutWithVcrRoom.collision[toIndex(12, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.collision[toIndex(13, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.decor[toIndex(12, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.decor[toIndex(13, 10)] = resolveTileToken('F1');
layoutWithVcrRoom.destroyedFloors[toIndex(12, 10)] = null;
layoutWithVcrRoom.destroyedFloors[toIndex(13, 10)] = null;
const BASE_HEIGHT = baseLayout.collision.length / BASE_WIDTH;
const DOOR_OPEN_TILE = resolveTileToken('OD');
const DOOR_CLOSED_TILE = resolveTileToken('DR');

const npcPackage = buildNpcPackage([
  placeNpc('cat', 4, 3, {
    script: {
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
    rewards: {
      'cat-collar-key': {
        id: 'cat-collar-key',
        actions: [
          {
            type: 'giveItem',
            item: getItem('collar-key'),
          },
          { type: 'unlock', targetId: 'north-gate' },
          { type: 'setFlag', flag: 'northGateUnlocked', value: true },
          { type: 'setArea', name: 'Únikový koridor' },
          { type: 'setLevelNumber', value: 3 },
        ],
        note: 'Našel jsi klíček na kočičím obojku. Severní dveře by se měly odjistit.',
      },
    },
  }),
  placeNpc('recording-cabinet', 5, 5, {
    script: {
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
    rewards: {
      'recording-cabinet-tape': {
        id: 'recording-cabinet-tape',
        actions: [
          {
            type: 'giveItem',
            item: getItem('videotape'),
          },
        ],
        note: 'note.videotape.found',
      },
    },
  }),
  placeNpc('vcr-player', 13, 10, {
    script: {
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
  }),
  placeNpc('spider', 9, 8, {
    id: 'spider-1',
    wanderRadius: TILE * 4,
    wanderInterval: 1.4,
  }),
  placeNpc('spider', 12, 6, {
    id: 'spider-2',
    wanderRadius: TILE * 5,
    wanderInterval: 1.2,
  }),
  placeNpc('spider', 6, 9, {
    id: 'spider-3',
    wanderRadius: TILE * 3,
    wanderInterval: 1,
  }),
]);

export const northernWingNpcPackage = {
  placements: npcPackage.placements,
  scripts: npcPackage.scripts,
  rewards: npcPackage.rewards,
};

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
    destroyedFloors: [...layoutWithVcrRoom.destroyedFloors],
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
    sources: [
      { tx: 3, ty: 3 },
      { tx: 10, ty: 7 },
    ],
    switches: [
      {
        id: 'hall-switch',
        name: 'Chodba',
        tx: 4,
        ty: 1,
      },
      {
        id: 'storage-switch',
        name: 'Sklad',
        tx: 12,
        ty: 5,
      },
      {
        id: 'lab-switch',
        name: 'Laboratoř',
        tx: 10,
        ty: 9,
      },
      {
        id: 'atrium-switch',
        name: 'Chodba ke skladu',
        tx: 2,
        ty: 7,
      },
      {
        id: 'north-exit-switch',
        name: 'Severní východ',
        tx: 13,
        ty: 1,
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * 2.5, y: TILE * 2.5 },
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
    placePickup('ammo', 6, 3, { quantity: 6 }),
    placePickup('ammo', 9, 8, { quantity: 6 }),
    placePickup('apple', 4, 9),
    placePickup('ammo', 13, 9, { quantity: 8 }),
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
