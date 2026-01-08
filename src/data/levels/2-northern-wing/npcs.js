import { TILE } from '../../../core/constants.js';
import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

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
            item: { id: 'collar-key', name: 'Klíček z obojku', icon: '🗝️', tint: '#f2d45c' },
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
            item: { id: 'videotape', name: 'Videokazeta', icon: '📼', tint: '#f2d45c' },
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

export const dialogues = northernWingNpcPackage.scripts;
export const rewards = northernWingNpcPackage.rewards;
