import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens, resolveTileToken } from '../map-utils.js';
import { placePickup } from '../../items/index.js';
import { abandonedLaboratoryNpcPackage } from './npcs.js';

const BASE_WIDTH = 20;
const BASE_HEIGHT = 15;

const baseSwitches = [
  {
    id: 'entry-switch',
    name: 'Vstupní vypínač',
    tx: 5,
    ty: 2,
    timerSeconds: 20,
    lights: [
      {
        x: 0,
        y: 0,
        w: 10,
        h: 3,
      },
    ],
  },
  {
    id: 'storage-switch',
    name: 'Skladový vypínač',
    tx: 13,
    ty: 5,
    timerSeconds: 25,
    lights: [
      {
        x: 9,
        y: 3,
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
    timerSeconds: 30,
    lights: [
      {
        x: 13,
        y: 7,
        w: 6,
        h: 6,
      },
    ],
  },
  {
    id: 'technician-switch',
    name: 'Servisní vypínač',
    tx: 7,
    ty: 9,
    timerSeconds: 18,
    lights: [
      {
        x: 5,
        y: 8,
        w: 5,
        h: 4,
      },
    ],
  },
];

/** @type {import('../../types.js').LevelConfig} */
const baseLayoutTokens = [
  'W1', 'W1D1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
  'W1', 'F1E1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4E3', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1', 'W1', 'W1D1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1E2', 'OD', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1D1', 'F1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'OD', 'F1', 'F1', 'W1', 'DR', 'W1', 'W1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1D1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
];
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const baseUnlockMask = [

  { tx: 14, ty: 10, tile: resolveTileToken('OD') },

];

export const abandonedLaboratoryLevel = {
  meta: {
    id: 'level-1',
    name: 'Opuštěná Laboratoř',
    title: 'Opuštěná Laboratoř',
    subtitle: 'hud.controls',
    levelNumber: 1,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout.collision],
    decor: [...baseLayout.decor],
    destroyedFloors: [...baseLayout.destroyedFloors],
    unlockMask: baseUnlockMask,
  },
  lighting: {
    litZones: [
      {
        x: 0,
        y: 0,
        w: 6,
        h: 6,
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
      openTile: resolveTileToken('OD'),
      nextLevelId: 'level-2',
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
    props: [],
    npcs: [...abandonedLaboratoryNpcPackage.placements],
  },
  pickups: [
    placePickup({
      id: 'battery-cell',
      name: 'Battery Cell',
      icon: '⚡',
      tx: 18,
      ty: 2,
      tint: '#f2d45c',
      description: 'A humming power source for the lab lights.',
      objective: true,
    }),
    placePickup({
      id: 'wrench',
      name: 'Service Wrench',
      icon: '🔧',
      tx: 12,
      ty: 9,
      tint: '#8ce0ff',
      description: 'Useful for tightening mech armor plating.',
      objective: true,
    }),
    placePickup({
      id: 'keycard',
      name: 'Keycard Fragment',
      icon: '🗝️',
      tx: 18,
      ty: 12,
      tint: '#c66bff',
      description: 'One part of an access card. Collect the rest later.',
      objective: true,
    }),
    placePickup('ammo', 4, 4, {
      description: 'Munice pro tvoji pistoli.',
      quantity: 6,
    }),
    placePickup('ammo', 16, 8, {
      description: 'Munice pro tvoji pistoli.',
      quantity: 6,
    }),
  ],
  rewards: abandonedLaboratoryNpcPackage.rewards,
  quests: [
    {
      id: 'talk-to-mayor',
      type: 'escort',
      name: 'Promluv si se starostkou Hanou',
      description:
        'Najdi starostku u vstupu do laboratoře a vyslechni její varování, abys nechodil potmě.',
      completedFlag: 'mayorIntroduced',
      completionNote: '[Úkol splněn] Starostka tě varovala před tmou a poslala tě za správcem laboratoře.',
    },
    {
      id: 'talk-to-caretaker',
      type: 'escort',
      name: 'Promluv se správcem laboratoře',
      description:
        'Hana chce, abys promluvil se správcem a zjistil, co se stalo v laboratoři, než půjdeš za technikem Járou.',
      completedFlag: 'caretakerIntroduced',
      completionNote:
        '[Úkol splněn] Správce tě vybavil, připomněl historii laboratoře a odkázal tě na Járu, který převezme sběr dílů.',
    },
    {
      id: 'talk-to-technician',
      type: 'escort',
      name: 'Promluv s technikem Járou',
      description: 'Jára musí převzít velení nad pátráním. Najdi ho u servisního stolu a rozsvěť mu, aby začal mluvit.',
      completedFlag: 'technicianQuestioned',
      completionNote:
        '[Úkol splněn] Jára ti kolektivně zadal sběr dílů a varoval tě před entitou, která některé z nich hlídá.',
    },
    {
      id: 'collect-components',
      type: 'collect',
      name: 'Prohledej laboratoř',
      description:
        'Jára ti kolektivně zadal sběr: energoblok, klíčový fragment a servisní nářadí. Některé kousky prý hlídá divná entita, tak měj připravené náboje.',
      objectiveCount: 3,
      completionNote: '[Úkol splněn] Všechny části máš. Jára může použít klíč a zjistit, co se v laboratoři dělo.',
    },
  ],
  npcScripts: abandonedLaboratoryNpcPackage.scripts,
};

export const dialogues = abandonedLaboratoryNpcPackage.scripts;
export const quests = abandonedLaboratoryLevel.quests;

export default {
  config: abandonedLaboratoryLevel,
  dialogues,
  quests,
};
