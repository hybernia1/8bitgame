import { TILE } from '../../../core/constants.js';
import { getItem } from '../../items/index.js';
import { buildTileLayersFromTokens } from '../map-utils.js';
import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

const BASE_WIDTH = 10;
const baseLayoutRows = [
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
  ['W1', 'F1', 'F2', 'F2', 'F1', 'F2', 'F2', 'F2', 'F1', 'W1'],
  ['W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1'],
  ['W1', 'F2', 'F2', 'F1', 'F2', 'F1', 'F2', 'F2', 'F2', 'W1'],
  ['W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1'],
  ['W1', 'F1', 'F2', 'F2', 'F1', 'F2', 'F2', 'F2', 'F1', 'W1'],
  ['W1', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'F2', 'W1'],
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
];
const baseLayoutTokens = baseLayoutRows.flat();
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const BASE_HEIGHT = baseLayout.collision.length / BASE_WIDTH;

const npcPackage = buildNpcPackage([
  placeNpc('mayor', 4, 2, {
    script: {
      defaultDialogue: 'Hana tě uklidňuje: „Doktor tě podrží, hlavně zhluboka dýchej.“',
      lines: [
        {
          id: 'hospital-mayor-1',
          when: [{ flag: 'hospitalMayorStep1', equals: false }],
          dialogue:
            'Zvedáš hlavu z polštáře a okamžitě ze sebe vysypeš: „Hano, jak jsem se sem dostal?“ Hana se k tobě skloní: „Na střeše jsi omdlel. Přitáhli jsme tě dolů. Pamatuješ si něco z toho chaosu?“',
          setState: { hospitalMayorStep1: true },
        },
        {
          id: 'hospital-mayor-2',
          when: [
            { flag: 'hospitalMayorStep1', equals: true },
            { flag: 'hospitalMayorStep2', equals: false },
          ],
          dialogue:
            'Zamyšleně svíráš přikrývku: „Je to rozmazané, ale kočka mi podala klíč a vedla mě ke dveřím. Jenže za nimi se na mě sápali pavouci.“',
          setState: { hospitalMayorStep2: true },
        },
        {
          id: 'hospital-mayor-3',
          when: [
            { flag: 'hospitalMayorStep2', equals: true },
            { flag: 'hospitalMayorStep3', equals: false },
          ],
          dialogue:
            'Hana se ušklíbne, i když jí v očích kmitne starost: „Nevěděla jsem, že se bojíš pavouků. Ale to, že ti kočky rozdávají klíče do kumbálu, mě trochu znervózňuje. Žádnou kočku jsme tam totiž neviděli.“',
          setState: { hospitalMayorStep3: true },
        },
        {
          id: 'hospital-mayor-4',
          when: [
            { flag: 'hospitalMayorStep3', equals: true },
            { flag: 'hospitalMayorStep4', equals: false },
          ],
          dialogue:
            'Zrudneš a sklopíš oči: „Možná se mi to celé jen zdálo.“ Hana přikývne, ale její pohled zůstává ostrý.',
          setState: { hospitalMayorStep4: true },
        },
        {
          id: 'hospital-mayor-complete',
          when: [
            { flag: 'hospitalMayorStep4', equals: true },
            { flag: 'hospitalSpokeWithMayor', equals: false },
          ],
          dialogue:
            '„Ať to byl sen nebo ne, nechci nic riskovat,“ rozhodne Hana. „Doktor je hned u monitoru. Promluv si s ním, než tě znovu pustíme do terénu.“',
          actions: [
            { type: 'setFlag', flag: 'hospitalSpokeWithMayor', value: true },
          ],
          setState: { hospitalMayorStep5: true },
          note: '[Úkol úspěšně dokončen] Starostka tě posílá promluvit s lékařem.',
        },
      ],
    },
  }),
  placeNpc('doctor', 6, 4, {
    script: {
      defaultDialogue: 'Doktor Viktor si zapisuje poznámky a mávne: „Odpočívej, hlava ti poděkuje.“',
      lines: [
        {
          id: 'doctor-wait',
          when: [{ flag: 'hospitalSpokeWithMayor', equals: false }],
          dialogue:
            'Doktor Viktor zvedne oči od monitoru: „Starostka tě nejdřív musí přivést k sobě. Přijď, až ti projde mlha z hlavy.“',
        },
        {
          id: 'doctor-intro',
          when: [
            { flag: 'hospitalSpokeWithMayor', equals: true },
            { flag: 'hospitalSpokeWithDoctor', equals: false },
          ],
          dialogue:
            'Doktor tě prohlédne světlem a kývne: „Pulz máš zpátky v normálu. Ty pavoučí vidiny budeme sledovat, ale zatím dýchej a drž se světla. Hana tě do ničeho nepožene, dokud sám nebudeš chtít.“',
          actions: [
            { type: 'setFlag', flag: 'hospitalSpokeWithDoctor', value: true },
          ],
          note: '[Úkol splněn] Doktor tě zkontroloval a pustil zpět do hry.',
        },
      ],
    },
  }),
  placeNpc('quizmaster', 2, 5, {
    script: {
      defaultDialogue: 'Archivářka Nora přepíná mezi záznamy: „Když chceš odměnu, zkus kvíz.“',
      lines: [
        {
          id: 'hospital-quiz-1',
          when: [{ flag: 'hospitalQuizStep1', equals: false }],
          dialogue: '„Začneme zlehka,“ usměje se Nora a podá ti tablet.',
          quiz: {
            question: 'Kolik je 1 + 1?',
            options: [{ label: '1' }, { label: '2', correct: true }, { label: '3' }],
            successNote: 'note.quiz.correct',
            failureNote: 'note.quiz.wrong',
          },
          setState: { hospitalQuizStep1: true },
        },
        {
          id: 'hospital-quiz-2',
          when: [
            { flag: 'hospitalQuizStep1', equals: true },
            { flag: 'hospitalQuizStep2', equals: false },
          ],
          dialogue: '„Dobře, druhá otázka,“ Nora poklepe na displej.',
          quiz: {
            question: 'Kolik je 3 - 1?',
            options: [{ label: '1' }, { label: '2', correct: true }, { label: '3' }],
            successNote: 'note.quiz.correct',
            failureNote: 'note.quiz.wrong',
          },
          setState: { hospitalQuizStep2: true },
        },
        {
          id: 'hospital-quiz-3',
          when: [
            { flag: 'hospitalQuizStep2', equals: true },
            { flag: 'hospitalQuizComplete', equals: false },
          ],
          dialogue: '„Poslední otázka a odměna je tvoje,“ zvedne Nora obočí.',
          quiz: {
            question: 'Kolik je 2 + 2?',
            options: [{ label: '3' }, { label: '4', correct: true }, { label: '5' }],
            successNote: 'note.quiz.reward',
            failureNote: 'note.quiz.wrong',
          },
          rewardId: 'hospital-quiz-apple',
          setState: { hospitalQuizComplete: true },
        },
        {
          id: 'hospital-quiz-repeat',
          when: [{ flag: 'hospitalQuizComplete', equals: true }],
          dialogue: '„Výborně! Kdykoliv si můžeš přijít zopakovat otázky,“ usměje se Nora.',
        },
      ],
    },
    rewards: {
      'hospital-quiz-apple': {
        id: 'hospital-quiz-apple',
        actions: [
          {
            type: 'giveItem',
            item: getItem('apple'),
          },
        ],
        note: 'note.quiz.reward',
      },
    },
  }),
]);

export const hospitalNpcPackage = {
  placements: npcPackage.placements,
  scripts: npcPackage.scripts,
  rewards: npcPackage.rewards,
};

/** @type {import('../../types.js').LevelConfig} */
export const hospitalLevel = {
  meta: {
    id: 'level-4',
    name: 'Nemocnice',
    title: 'Nemocnice',
    subtitle: 'Probouzení v neonovém světle',
    levelNumber: 4,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout.collision],
    decor: [...baseLayout.decor],
    destroyedFloors: [...baseLayout.destroyedFloors],
  },
  lighting: {
    sources: [
      {
        tx: Math.floor(BASE_WIDTH / 2),
        ty: Math.floor(BASE_HEIGHT / 2),
      },
    ],
    switches: [],
  },
  interactables: {
    safes: [
      {
        id: 'demo-safe',
        name: 'Nemocniční sejf',
        tx: 7,
        ty: 2,
        code: '0000',
        codeLength: 4,
        reward: getItem('apple'),
        rewardNote: 'note.safe.itemReceived',
        emptyNote: 'note.safe.empty',
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * 4.5, y: TILE * 3.5 },
    props: [],
    npcs: [...hospitalNpcPackage.placements],
  },
  pickups: [],
  rewards: hospitalNpcPackage.rewards,
  quests: [
    {
      id: 'talk-to-mayor',
      type: 'escort',
      name: 'Promluv se starostkou Hanou',
      description: 'Prober se na nemocničním lůžku a zjisti od Hany, co se stalo.',
      completedFlag: 'hospitalSpokeWithMayor',
    },
    {
      id: 'talk-to-doctor',
      type: 'escort',
      name: 'Promluv se s lékařem',
      description: 'Vyhledej doktora Viktora a nech si zkontrolovat stav i zvláštní vzpomínky.',
      completedFlag: 'hospitalSpokeWithDoctor',
    },
  ],
  npcScripts: hospitalNpcPackage.scripts,
};

export const dialogues = hospitalNpcPackage.scripts;
export const quests = hospitalLevel.quests;

export default {
  config: hospitalLevel,
  dialogues,
  quests,
};
