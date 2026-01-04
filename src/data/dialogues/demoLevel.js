/** @type {import('../types.js').NpcScriptCollection} */
export const demoLevelDialogues = {
  mayor: {
    defaultDialogue:
      'Omlouvám se, že tě táhnu rovnou do laboratoře. Za poslední měsíc zmizely tři děti a mám strach, že jde o nějaký okultní rituál. Tohle je první místo, kde musíme hledat stopy.',
    lines: [
      {
        id: 'mayor-intro-1',
        when: [{ flag: 'mayorChatStep1', equals: false }],
        dialogue:
          'Hana tě vítá s unaveným úsměvem: „Dostals můj telefonát. V laboratoři zmizely tři děti a bojím se, že v tom jede někdo zevnitř.“',
        setState: { mayorChatStep1: true },
      },
      {
        id: 'mayor-intro-2',
        when: [
          { flag: 'mayorChatStep1', equals: true },
          { flag: 'mayorChatStep2', equals: false },
        ],
        dialogue:
          '„Jsem tady,“ odpovíš jí. „Nevzdám to, dokud nepochopím, co se v téhle budově děje.“ Hana přikývne a zhluboka se nadechne.',
        setState: { mayorChatStep2: true },
      },
      {
        id: 'mayor-intro-3',
        when: [
          { flag: 'mayorChatStep2', equals: true },
          { flag: 'mayorIntroduced', equals: false },
        ],
        dialogue:
          '„Začni prohlídkou laboratoře,“ dodá Hana. „Stopy tu někde jsou. Budu poblíž a budu tě krýt, kdybys něco našel.“',
        setState: { mayorIntroduced: true },
      },
    ],
  },
  caretaker: {
    defaultDialogue: 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.',
    lines: [
      {
        id: 'caretaker-intro',
        when: [{ flag: 'caretakerSharedLab', equals: false }],
        dialogue:
          'Správce si nervózně utře ruce do pláště: „Laboratoř je plná hluchých míst, někde se snadno ztratíš. Nic podezřelého jsem neviděl, ale Technik Jára se tady potuluje potmě – zkus se ho zeptat, možná něco zaslechl.“',
        setState: { caretakerSharedLab: true },
      },
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
        id: 'technician-intro',
        when: [{ flag: 'technicianSharedLab', equals: false }],
        dialogue:
          'Technik Jára ti přitáhne baterku k obličeji: „Tady je noc všechno rozmazaná. Nic konkrétního jsem neviděl, ale ve tmě občas slyším kroky od skladu. Drž se světla.“',
        setState: { technicianSharedLab: true },
      },
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
