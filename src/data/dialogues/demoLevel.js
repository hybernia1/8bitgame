/** @type {import('../types.js').NpcScriptCollection} */
export const demoLevelDialogues = {
  mayor: {
    defaultDialogue:
      'Omlouvám se, že tě táhnu rovnou do laboratoře. Za poslední měsíc zmizely tři děti a mám strach, že jde o nějaký okultní rituál. Tohle je první místo, kde musíme hledat stopy.',
    lines: [
      {
        id: 'mayor-intro',
        when: [{ flag: 'mayorIntroduced', equals: false }],
        dialogue:
          'Dostals můj telefonát. Prosím, projdi laboratoř a zjisti, jestli tu nenajdeš něco, co by vysvětlilo, kam děti mizí.',
        setState: { mayorIntroduced: true },
      },
    ],
  },
  caretaker: {
    defaultDialogue: 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.',
    lines: [
      {
        id: 'give-apple',
        when: [{ flag: 'caretakerGaveApple', equals: false }],
        dialogue: 'Tady máš jablko, doplní ti síly. Stiskni číslo slotu nebo na něj klikni v inventáři.',
        note: 'Správce ti předal jablko. Použij číslo slotu (1-6) nebo klikni na slot pro doplnění jednoho života.',
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
  technician: {
    defaultDialogue: 'Hej, slyšel jsem šumění u zadního skladu. Možná tam něco blýská.',
    infoNote: 'Technik Jára ti pošeptal: "V rohu skladiště u zdi zůstal energoblok, zkus ho vzít."',
    lines: [
      {
        id: 'collect-first',
        when: [{ questIncomplete: 'collect-components' }],
        dialogue: 'Musíš donést všechny díly. Jakmile je máš, vrátíš se pro klíč a já ti otevřu dveře.',
      },
      {
        id: 'give-key',
        when: [
          { questComplete: 'collect-components' },
          { flag: 'technicianGaveKey', equals: false },
        ],
        dialogue: 'Tady máš klíč. Dveře otevřeš směrem na východ do nové mapy.',
        rewardId: 'technician-gate-key',
        actions: [{ type: 'setFlag', flag: 'technicianGaveKey', value: true }],
      },
      {
        id: 'tech-default',
        dialogue: 'Dveře už jsou otevřené. Vejdi dál a pozor na nové prostory.',
      },
    ],
  },
};
