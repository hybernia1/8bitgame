export const messages = {
  'interaction.title': 'Interakce',
  'interaction.initialPrompt': 'Přibliž se ke starostce a stiskni E.',
  'prompt.talk': 'Stiskni E pro rozhovor s {name}',
  'prompt.switch': 'Stiskni E pro aktivaci vypínače',
  'prompt.gateLocked': 'Dveře jsou zamčené. Technik Jára má klíč.',
  'prompt.gateUnlocked': 'Dveře jsou otevřené, stiskni E pro vstup do nové mapy.',
  'dialogue.npcDefault': 'Ráda tě vidím v základně.',
  'dialogue.gateUnlocked': 'Vstup potvrzen. Přecházíš do nového mapového křídla.',
  'speaker.gateSystem': 'Systém Dveří',
  'hud.levelTitle': 'Level {level}: {name}',
  'loading.transition': 'Načítám level {name}...',
  'loading.ready': 'Level {name} je připraven.',
  'loading.pressAnyKey': 'Stiskni libovolnou klávesu pro pokračování.',
  'hud.controls':
    'Pohyb: WASD/šipky · Interakce: {interact} · Střelba: {shoot} · Inventář: {inventory} · Pauza: {pause}',
  'note.inventory.intro': 'Mapa je ponořená do tmy. Hledej vypínače na zdech a seber všechny komponenty.',
  'note.inventory.toggle': 'Otevři nebo zavři batoh klávesou {binding} či ikonou batůžku.',
  'note.inventory.pinnedShort': '{binding} nebo ikona batohu',
  'note.inventory.emptySlot': 'Slot {index} je prázdný.',
  'note.inventory.slotLabel': 'Slot {index}',
  'note.inventory.unusable': 'Tenhle předmět teď nemůžeš použít.',
  'note.switch.activated': 'Vypínač {name} rozsvítil další část místnosti.',
  'note.switch.alreadyOn': 'Vypínač už je aktivovaný.',
  'note.pickup.collected': 'Sebráno: {items}',
  'note.quest.completed': 'Mise splněna: všechny komponenty jsou připravené. Vrať se za Technikem Járou.',
  'note.gate.consumeKey': 'Klíč se zasunul do zámku a zmizel z inventáře.',
  'note.combat.noAmmo': 'Došla ti munice. Posbírej další náboje.',
  'note.combat.npcDown': '{name} byl vyřazen.',
  'note.combat.npcHit': '{name} - zásah! Zbývá {hp} HP.',
  'note.apple.fullHealth': 'Máš plné zdraví, jablko si nech na horší chvíli.',
  'note.apple.healed': 'Jablko ti doplnilo jeden život.',
  'note.videotape.found': 'Vytáhl jsi videokazetu, ale poblíž není žádný přehrávač.',
  'note.videotape.played':
    'Kazeta byla prázdná a přehrávání skončilo šumem. Technik Jára tě sem poslal zbytečně.',
  'note.damage.hit': 'Zásah! Přišel jsi o život. Vrať se a dávej si pozor.',
  'note.death.guard': 'Hlídač klíče tě zneškodnil. Mise se restartuje...',
  'note.damage.darkness': 'Tma pálí! Najdi vypínač a rozsviť část místnosti.',
  'note.death.darkness': 'Tma tě zcela pohltila. Mise se restartuje...',
  'note.death.darknessTeleport': 'Tma tě stáhla, ale podařilo se ti přenést na nejbližší světlo.',
  'note.save.auto': 'Auto-save dokončen (slot {slot}).',
  'note.save.manual': 'Uloženo do slotu {slot}.',
  'note.save.missingSlot': 'Vyber slot, do kterého chceš uložit.',
  'menu.save.empty': 'Žádné uložené pozice.',
  __missing: '[[{key}]]',
};

function getTemplate(idOrText) {
  if (messages[idOrText]) {
    return messages[idOrText];
  }
  if (typeof idOrText === 'string' && idOrText.includes(' ')) {
    return idOrText;
  }
  if (messages.__missing && typeof idOrText === 'string') {
    return messages.__missing.replace('{key}', idOrText);
  }
  return idOrText ?? '';
}

export function format(idOrText, params = {}) {
  const template = getTemplate(idOrText);
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = params[key.trim()];
    return value != null ? String(value) : '';
  });
}

export function getMessageSnapshot() {
  const { __missing, ...knownMessages } = messages;
  return { ...knownMessages };
}
