import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens, resolveTileToken } from '../map-utils.js';
import { getItem, placePickup } from '../../items/index.js';
import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

const BASE_WIDTH = 20;
const BASE_HEIGHT = 15;

const baseSwitches = [
  {
    id: 'entry-switch',
    name: 'Vstupní vypínač',
    tx: 5,
    ty: 2,
    timerSeconds: 20,
  },
  {
    id: 'storage-switch',
    name: 'Skladový vypínač',
    tx: 13,
    ty: 5,
    timerSeconds: 25,
  },
  {
    id: 'lab-switch',
    name: 'Laboratorní vypínač',
    tx: 17,
    ty: 9,
    timerSeconds: 30,
  },
  {
    id: 'technician-switch',
    name: 'Servisní vypínač',
    tx: 7,
    ty: 9,
    timerSeconds: 18,
  },
];

/** @type {import('../../types.js').LevelConfig} */
const baseLayoutRows = [
  ['W1', 'W1D1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
  ['W1', 'F1E1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4E3', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1', 'W1', 'W1D1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'DR', 'F1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F4', 'F4', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1E2', 'OD', 'W1', 'W1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1D1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'F1', 'OD', 'F1', 'F1', 'W1', 'DR', 'W1', 'W1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'W1', 'W1', 'W1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1D1', 'F1', 'W1'],
  ['W1', 'F1', 'F1', 'F1', 'F1', 'W1', 'W1', 'W1', 'W1', 'W1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1', 'F1', 'F1', 'F1', 'W1'],
  ['W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1'],
];
const baseLayoutTokens = baseLayoutRows.flat();
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);
const baseUnlockMask = [

  { tx: 14, ty: 10, tile: resolveTileToken('OD') },

];

const npcPackage = buildNpcPackage([
  placeNpc('mayor', 3, 2, {
    script: {
      defaultDialogue:
        'Hana ztiší hlas: „Drž se světla. V téhle laboratoři je tma největší nepřítel.“',
      lines: [
        {
          id: 'mayor-intro-1',
          when: [{ flag: 'mayorChatStep1', equals: false }],
          dialogue:
            'Hana tě zastaví hned u dveří: „Nechoď do té laboratoře potmě. Světlo ti zachrání kůži a vypínače jsou všude kolem.“',
          setState: { mayorChatStep1: true },
        },
        {
          id: 'mayor-intro-2',
          when: [
            { flag: 'mayorChatStep1', equals: true },
            { flag: 'mayorChatStep2', equals: false },
          ],
          dialogue:
            '„Zmizely tři děti a tahle budova je poslední stopa,“ vysvětluje Hana. „Musíme postupovat opatrně, žádné hrdinství ve tmě.“',
          setState: { mayorChatStep2: true },
        },
        {
          id: 'mayor-intro-3',
          when: [
            { flag: 'mayorChatStep2', equals: true },
            { flag: 'mayorIntroduced', equals: false },
          ],
          dialogue:
            'Hana ti podá mapku vstupu: „Správce laboratoře zná tyhle chodby a ví, kde bývalo světlo. Najdeš ho kousek od generátoru. Promluv s ním a drž se osvětlených míst.“',
          actions: [{ type: 'setFlag', flag: 'mayorIntroduced', value: true }],
          setState: { mayorIntroduced: true },
          note: '[Úkol splněn] Seznámil ses se starostkou. Nový úkol: promluv si se správcem laboratoře.',
        },
      ],
    },
  }),
  placeNpc('caretaker', 10, 4, {
    script: {
      defaultDialogue:
        'Správce nervózně kouká do stínu: „Tahle chodba bývala plná světla. Teď musíš rozsvítit, než se vydáš dál.“',
      lines: [
        {
          id: 'caretaker-wait-mayor',
          when: [{ flag: 'mayorIntroduced', equals: false }],
          dialogue:
            'Správce si tě měří: „Starostka Hana tě chce nejdřív vidět. Promluv si s ní a hlavně nechoď do té tmy sám.“',
        },
        {
          id: 'caretaker-intro',
          when: [
            { flag: 'mayorIntroduced', equals: true },
            { flag: 'caretakerIntroduced', equals: false },
          ],
          dialogue:
            'Správce si nervózně utře ruce do pláště: „Tahle laboratoř kdysi testovala nové zdroje světla. Po výpadku jsme bloudili poslepu a lidi panikařili. Technik Jára má záznamy, které mohou říct víc a převezme sběr dílů. Najdeš ho u servisního stolu – ale nejdřív si rozviť vypínače kolem.“',
          actions: [
            { type: 'setFlag', flag: 'caretakerSharedLab', value: true },
            { type: 'setFlag', flag: 'caretakerIntroduced', value: true },
          ],
          note: '[Úkol splněn] Správce tě posílá za technikem Járou, který ti předá další pokyny.',
        },
        {
          id: 'give-apple',
          when: [
            { flag: 'caretakerIntroduced', equals: true },
            { flag: 'caretakerGaveApple', equals: false },
          ],
          dialogue:
            'Správce sáhne do kapsy: „Na cestu vezmi tohle jablko. Dodá ti sílu, když se ti ve tmě zatmí před očima. Stiskni číslo slotu nebo na něj klikni v inventáři.“',
          note: 'Správce ti předal jablko. Použij číslo slotu (1-12) nebo klikni na slot pro doplnění jednoho života.',
          rewardId: 'caretaker-apple',
          actions: [{ type: 'setFlag', flag: 'caretakerGaveApple', value: true }],
        },
        {
          id: 'apple-reminder',
          when: [
            { flag: 'caretakerIntroduced', equals: true },
            { flag: 'caretakerGaveApple', equals: true },
            { hasItem: 'apple' },
          ],
          dialogue: 'Jablko máš v inventáři. Klikni na slot nebo stiskni jeho číslo, až budeš potřebovat život.',
        },
        {
          id: 'caretaker-default',
          dialogue:
            'Energoblok, servisní klíč i fragment karty jsme kdysi používali denně. Doneseš-li je Járovi, možná rozklíčuje, co se tu stalo. Všechno řeš s ním – já ti jen držím světlo. A pamatuj: tma není kamarád.',
        },
      ],
    },
    rewards: {
      'caretaker-apple': {
        id: 'caretaker-apple',
        actions: [
          {
            type: 'giveItem',
            item: getItem('apple'),
          },
        ],
        note: 'Správce ti předal jablko. Použij číslo slotu (1-12) nebo klikni na slot pro doplnění jednoho života.',
      },
    },
  }),
  placeNpc('technician', 6, 9, {
    patrol: [
      { tx: 6, ty: 9 },
      { tx: 7, ty: 9 },
      { tx: 7, ty: 10 },
      { tx: 6, ty: 10 },
    ],
    script: {
      defaultDialogue:
        'Jára si drží baterku u hrudi: „Bez světla a náhradních dílů se nikam nepohneme. U vypínače budeme v bezpečí.“',
      infoNote: 'Technik Jára tě šeptem upozornil: „Energoblok visí u hlídače klíče. Drž se světla.“',
      lines: [
        {
          id: 'technician-waiting-caretaker',
          when: [{ flag: 'caretakerIntroduced', equals: false }],
          dialogue:
            'Jára si tě prohlíží přes záři baterky: „Správce tě musí nejdřív zasvětit. Vrať se za mnou, až ti řekne, co se tady dělo.“',
        },
        {
          id: 'technician-dark',
          when: [
            { flag: 'technicianLightOn', equals: false },
            { flag: 'technicianQuestioned', equals: false },
          ],
          dialogue:
            'Technik Jára tě přeměří ve tmě: „Vidíš ten vypínač vedle mě? Rozsviť to. Dokud tu nehoří světlo, nic ti neřeknu.“',
        },
        {
          id: 'technician-interview',
          when: [
            { flag: 'technicianLightOn', equals: true },
            { flag: 'technicianQuestioned', equals: false },
          ],
          dialogue:
            'Jára si zacloní oči před světlem: „Správce říkal, že víš, jak je to tu složité. Potřebuju tři věci – energoblok, servisní klíč a fragment klíčové karty. Některé díly hlídá divná entita, tak doufám, že máš náboje. Přines je a klíč k technické místnosti je tvůj.“',
          actions: [
            { type: 'setFlag', flag: 'technicianQuestioned', value: true },
            { type: 'setFlag', flag: 'technicianSharedLab', value: true },
          ],
          note:
            '[Nový úkol] Jára ti kolektivně zadal sběr energobloku, servisního klíče a fragmentu karty. Některé díly hlídá divná entita – měj náboje.',
        },
        {
          id: 'collect-first',
          when: [
            { questIncomplete: 'collect-components' },
            { flag: 'technicianQuestioned', equals: true },
          ],
          dialogue:
            '„Ty fragmenty někde v téhle laborce musí být,“ naléhá Jára. „Energoblok u hlídače, fragment karty i servisní klíč – přines je a klíč od technické místnosti je tvůj. Dávej pozor na entitu a šetři náboje.“',
        },
        {
          id: 'give-key',
          when: [
            { questComplete: 'collect-components' },
            { flag: 'technicianGaveKey', equals: false },
          ],
          dialogue:
            'Jára kývne a podává klíč: „Držíš slovo. Tady máš klíč k technické místnosti. Kamery a záznamy ti prozradí, co se tu stalo.“',
          rewardId: 'technician-gate-key',
          actions: [{ type: 'setFlag', flag: 'technicianGaveKey', value: true }],
        },
        {
          id: 'tech-default',
          dialogue: 'Dveře do technické místnosti jsou odemčené. Jdi dovnitř a zjisti, co ukazují kamery.',
        },
      ],
    },
    rewards: {
      'technician-gate-key': {
        id: 'technician-gate-key',
        actions: [
          {
            type: 'giveItem',
            item: getItem('gate-key'),
          },
          { type: 'unlock', targetId: 'gate' },
          { type: 'clearObjectives' },
          { type: 'setArea', name: 'Severní křídlo laboratoře' },
          { type: 'setLevelNumber', value: 2 },
        ],
        note: 'Klíč získán! Východní dveře se odemkly a mapa se rozšířila.',
      },
    },
  }),
  placeNpc('key-guard', 18, 11, {
    patrol: [
      { tx: 18, ty: 1 },
      { tx: 18, ty: 12 },
    ],
  }),
]);

export const abandonedLaboratoryNpcPackage = {
  placements: npcPackage.placements,
  scripts: npcPackage.scripts,
  rewards: npcPackage.rewards,
};

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
    sources: [
      {
        tx: 2,
        ty: 2,
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
    decor: [
      {
        id: 'lab-decor-trash',
        tx: 1,
        ty: 1,
        dialogue: 'Jsou to jen odpadky.',
      },
      {
        id: 'lab-decor-ammo',
        tx: 7,
        ty: 3,
        dialogue: 'Jo tohle se bude hodit.',
        flag: 'labDecorAmmoCollected',
        actions: [
          {
            type: 'giveItem',
            item: {
              ...getItem('ammo'),
              quantity: 3,
            },
          },
        ],
      },
      {
        id: 'lab-decor-schedule',
        tx: 6,
        ty: 7,
        dialogue: 'Hmm rozpis směn z roku 1978, tady už opravdu dlouho nikdo nepracuje.',
      },
    ],
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
    placePickup('cigar', 7, 4, {
      description: 'Povzbuzující doutník, který snižuje stres.',
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
