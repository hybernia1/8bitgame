import { TILE } from '../../../core/constants.js';
import { buildTileLayersFromTokens } from '../map-utils.js';

const WIDTH = 10;
const HEIGHT = 8;

const layoutTokens = [
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'F1', 'W1',
  'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1', 'W1',
];

const layout = buildTileLayersFromTokens(layoutTokens);

export const prologueLevel = {
  meta: {
    id: 'level-0-prologue',
    name: 'Prolog',
    title: 'Prolog: telefonát',
    subtitle: 'Úvod do pátrání',
    levelNumber: 0,
    dimensions: { width: WIDTH, height: HEIGHT },
  },
  dimensions: { width: WIDTH, height: HEIGHT },
  tileLayers: {
    collision: [...layout.collision],
    decor: [...layout.decor],
  },
  lighting: {
    litZones: [
      {
        x: 0,
        y: 0,
        w: WIDTH,
        h: HEIGHT,
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * 5, y: TILE * 4 },
    monsters: [],
    props: [],
    npcs: [],
  },
  pickups: [],
  npcScripts: {},
  quests: [],
};

export const prologueDialogues = [
  {
    title: 'Návrat snu',
    kicker: 'Prolog',
    speaker: 'Ty',
    speakerType: 'player',
    avatar: 'player',
    actionLabel: 'Probudit se',
    body: [
      'Zase se mi vrací sen o rodině – dětský smích, ruce, které už nedržím, a pak jen ticho prořezané sirénou.',
      'Probudím se s hlavou těžkou od léků, které mají ty obrazy utlumit. Ale místo klidu cítím jen stín, který mě žene dál.',
    ],
  },
  {
    title: 'Telefonát ve tmě',
    kicker: 'Zvonění uprostřed noci',
    speaker: 'Hana',
    speakerType: 'npc',
    avatar: 'hana',
    actionLabel: 'Vyrazím',
    body: [
      '„Potřebuju tě,“ šeptá Hana. „Během měsíce zmizely tři děti a policie tápe.“',
      '„Všechny stopy vedou k opuštěné laboratoři na kopci.“',
    ],
  },
  {
    title: 'Odpověď',
    kicker: 'Rozhodnutí',
    speaker: 'Ty',
    speakerType: 'player',
    avatar: 'player',
    actionLabel: 'Vyrazit do vesnice',
    body: ['Přijímám bez váhání – i kdybych měl znovu otevřít rány, které nikdy nezmizely.'],
  },
];

export const dialogues = { prologue: prologueDialogues };

export default {
  config: prologueLevel,
  dialogues,
};
