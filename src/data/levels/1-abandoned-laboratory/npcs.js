import { getPickupPreset } from '../../pickups/index.js';
import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

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
            item: getPickupPreset('apple'),
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
            item: { id: 'gate-key', name: 'Klíč od dveří', icon: '🔑', tint: '#f2d45c' },
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

export const dialogues = abandonedLaboratoryNpcPackage.scripts;
export const rewards = abandonedLaboratoryNpcPackage.rewards;
