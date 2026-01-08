import { TILE, VIEWPORT } from '../../../core/constants.js';
import { buildTileLayersFromTokens } from '../map-utils.js';

const BASE_WIDTH = VIEWPORT.width;
const BASE_HEIGHT = VIEWPORT.height;
const baseLayoutTokens = Array.from({ length: BASE_WIDTH * BASE_HEIGHT }, () => 'F1');
const baseLayout = buildTileLayersFromTokens(baseLayoutTokens);

export const prologueCutscene = {
  id: 'prologue',
  nextLevelId: 'level-1',
  imageFolder: new URL('./img', import.meta.url).href,
  imageExtension: 'svg',
  steps: [
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
  ],
};

export const prologueLevel = {
  meta: {
    id: 'level-0-prologue',
    name: 'Prolog',
    title: 'Prolog: telefonát',
    subtitle: 'Úvod do pátrání',
    levelNumber: 0,
    cutscene: prologueCutscene,
    dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  },
  dimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  tileLayers: {
    collision: [...baseLayout.collision],
    decor: [...baseLayout.decor],
    destroyedFloors: [...baseLayout.destroyedFloors],
    unlockMask: [],
  },
  lighting: {
    litZones: [
      {
        x: 0,
        y: 0,
        w: BASE_WIDTH,
        h: BASE_HEIGHT,
      },
    ],
  },
  actors: {
    playerStart: { x: TILE * (BASE_WIDTH / 2), y: TILE * (BASE_HEIGHT / 2) },
    props: [],
    npcs: [],
  },
  pickups: [],
};

export default {
  config: prologueLevel,
};
