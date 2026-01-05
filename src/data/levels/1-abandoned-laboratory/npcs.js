import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

const presets = {
  mayor: {
    id: 'mayor',
    name: 'Starostka Hana',
    sprite: 'hana',
    dialogue: 'Hana ztiší hlas: „Potřebuji tě tady. Jde o tři ztracené děti.“',
  },
  caretaker: {
    id: 'caretaker',
    name: 'Správce Laboratoře',
    sprite: 'caretaker',
    dialogue: 'Správce šeptá: „Sežeň články a nářadí. Tma tu nesmí vyhrát.“',
  },
  technician: {
    id: 'technician',
    name: 'Technik Jára',
    sprite: 'jara',
    dialogue: 'Jára si drží baterku u hrudi: „Potřebujeme světlo, jinak jsme slepí.“',
    infoNote: 'Technik Jára ti pošeptal: "V rohu skladiště u zdi zůstal energoblok, zkus ho vzít."',
  },
  keyGuard: {
    id: 'key-guard',
    name: 'Hlídač Klíče',
    sprite: 'monster',
    dialogue: 'Stůj! Klíč tady nikdo neukradne.',
    speed: 50,
    lethal: true,
    health: 3,
  },
};

const npcPackage = buildNpcPackage([
  placeNpc({
    preset: presets.mayor,
    tx: 3,
    ty: 2,
    script: {
      defaultDialogue:
        'Hana ztiší hlas: „Potřebuji tě tady. Jde o tři ztracené děti a všechny stopy vedou do téhle laboratoře.“',
      lines: [
        {
          id: 'mayor-intro-1',
          when: [{ flag: 'mayorChatStep1', equals: false }],
          dialogue:
            'Hana tě vítá s unaveným úsměvem: „Díky, žes přijel. V laboratoři zmizely tři děti a někdo je v tom namočený. Potřebuju někoho, komu věřím.“',
          setState: { mayorChatStep1: true },
        },
        {
          id: 'mayor-intro-2',
          when: [
            { flag: 'mayorChatStep1', equals: true },
            { flag: 'mayorChatStep2', equals: false },
          ],
          dialogue:
            '„Jsem tady a nenechám to být,“ ujistíš ji. Hana přikývne: „Nejsi na to sám. Budu poblíž a pomůžu, jak jen to půjde.“',
          setState: { mayorChatStep2: true },
        },
        {
          id: 'mayor-intro-3',
          when: [
            { flag: 'mayorChatStep2', equals: true },
            { flag: 'mayorIntroduced', equals: false },
          ],
          dialogue:
            '„Prohledej laboratoř,“ šeptá Hana. „Stopy tu někde jsou. Kdyby se něco zvrtlo, dej mi znamení.“',
          setState: { mayorIntroduced: true },
        },
      ],
    },
  }),
  placeNpc({
    preset: presets.caretaker,
    tx: 10,
    ty: 4,
    script: {
      defaultDialogue:
        'Správce nervózně kouká do stínu: „Sežeň náhradní články a nářadí, jinak tu tma neskončí.“',
      lines: [
        {
          id: 'caretaker-intro',
          when: [{ flag: 'caretakerSharedLab', equals: false }],
          dialogue:
            'Správce si nervózně utře ruce do pláště: „Laboratoř je plná hluchých míst. Technik Jára se tu potuluje potmě – u jeho stolu je vypínač, třeba se ti přizná, proč nechává tmu všude kolem.“',
          setState: { caretakerSharedLab: true },
        },
        {
          id: 'give-apple',
          when: [{ flag: 'caretakerGaveApple', equals: false }],
          dialogue: 'Tady máš jablko, doplní ti síly. Stiskni číslo slotu nebo na něj klikni v inventáři.',
          note: 'Správce ti předal jablko. Použij číslo slotu (1-12) nebo klikni na slot pro doplnění jednoho života.',
          rewardId: 'caretaker-apple',
          actions: [{ type: 'setFlag', flag: 'caretakerGaveApple', value: true }],
        },
        {
          id: 'apple-reminder',
          when: [
            { flag: 'caretakerGaveApple', equals: true },
            { hasItem: 'apple' },
          ],
          dialogue: 'Jablko máš v inventáři. Klikni na slot nebo stiskni jeho číslo, až budeš potřebovat život.',
        },
        {
          id: 'caretaker-default',
          dialogue: 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.',
        },
      ],
    },
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
      note: 'Správce ti předal jablko. Použij číslo slotu (1-12) nebo klikni na slot pro doplnění jednoho života.',
      },
    },
  }),
  placeNpc({
    preset: presets.technician,
    tx: 6,
    ty: 9,
    patrol: [
      { tx: 6, ty: 9 },
      { tx: 7, ty: 9 },
      { tx: 7, ty: 10 },
      { tx: 6, ty: 10 },
    ],
    script: {
      defaultDialogue:
        'Jára si drží baterku u hrudi: „Tady je tma na každém kroku. Rozhlížej se – jestli chceš odpovědi, potřebuješ světlo.“',
      infoNote: presets.technician.infoNote,
      lines: [
        {
          id: 'technician-dark',
          when: [
            { flag: 'technicianLightOn', equals: false },
            { flag: 'technicianQuestioned', equals: false },
          ],
          dialogue:
            'Technik Jára tě přeměří ve tmě: „Vidíš ten vypínač vedle mě? Rozsviť to. V téhle tmě se bavit nebudu.“',
        },
        {
          id: 'technician-interview',
          when: [
            { flag: 'technicianLightOn', equals: true },
            { flag: 'technicianQuestioned', equals: false },
          ],
          dialogue:
            'Jára si zacloní oči před světlem: „Dobře, ptáš se proč jsem bloudil potmě? Protože tu nic není... nebo to tak aspoň musí vypadat.“ Nakonec dodá tiše: „Sežeň mi potřebné fragmenty vybavení a já ti dám klíče. V technické místnosti jsou kamery – možná na nich něco uvidíš.“',
          setState: { technicianQuestioned: true, technicianSharedLab: true },
        },
        {
          id: 'collect-first',
          when: [
            { questIncomplete: 'collect-components' },
            { flag: 'technicianQuestioned', equals: true },
          ],
          dialogue:
            '„Ty fragmenty někde v téhle laborce musí být,“ naléhá Jára. „Dones je a já odemknu technickou místnost s kamerami. Bez nich jsme slepí.“',
        },
        {
          id: 'give-key',
          when: [
            { questComplete: 'collect-components' },
            { flag: 'technicianGaveKey', equals: false },
          ],
          dialogue:
            'Jára kývne a podává klíč: „Držíš slovo. Tenhle klíč ti otevře technickou místnost s kamerami. Zjisti, co tam skrývají.“',
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
            item: { id: 'gate-key', name: 'Klíč od dveří', icon: '🔑', tint: '#f2d45c' },
            blockedDialogue: 'Tvůj inventář je plný, uvolni si místo na klíč.',
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
  placeNpc({
    preset: presets.keyGuard,
    tx: 18,
    ty: 11,
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

export const dialogues = abandonedLaboratoryNpcPackage.scripts;
export const rewards = abandonedLaboratoryNpcPackage.rewards;
