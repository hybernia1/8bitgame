import { buildNpcPackage, placeNpc } from '../../npcs/index.js';

const presets = {
  mayor: {
    id: 'mayor',
    name: 'Starostka Hana',
    sprite: 'hana',
    dialogue: 'Hana se sklání k lůžku a hlídá každý tvůj dech.',
  },
  doctor: {
    id: 'doctor',
    name: 'Doktor Viktor',
    sprite: 'npc',
    dialogue: 'Doktor Viktor si zapisuje tvůj puls a prohlíží nástroje.',
  },
  quizmaster: {
    id: 'quizmaster',
    name: 'Archivářka Nora',
    sprite: 'npc',
    dialogue: 'Archivářka Nora drží tablet a čeká, až odpovíš na kontrolní otázky.',
  },
};

const npcPackage = buildNpcPackage([
  placeNpc({
    preset: presets.mayor,
    tx: 4,
    ty: 2,
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
  placeNpc({
    preset: presets.doctor,
    tx: 6,
    ty: 4,
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
  placeNpc({
    preset: presets.quizmaster,
    tx: 2,
    ty: 5,
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
            item: { id: 'apple', name: 'Jablko', icon: '🍎', tint: '#f25c5c' },
            blockedDialogue: 'Batoh je plný, odměnu teď neuneseš.',
            blockedNote: 'note.quiz.inventoryFull',
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

export const dialogues = hospitalNpcPackage.scripts;
export const rewards = hospitalNpcPackage.rewards;
