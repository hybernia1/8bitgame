const items = {
  apple: {
    id: 'apple',
    name: 'Jablko',
    icon: '🍎',
    tint: '#f25c5c',
    useHandler({ inventory, slotIndex, playerVitals, updateHealthHud, renderInventory, showNote }) {
      if (playerVitals.health >= playerVitals.maxHealth) {
        showNote?.('note.apple.fullHealth');
        return;
      }

      const consumed = inventory.consumeSlot(slotIndex, 1);
      if (!consumed) return;

      playerVitals.health = Math.min(playerVitals.maxHealth, playerVitals.health + 1);
      updateHealthHud?.();
      renderInventory?.(inventory);
      showNote?.('note.apple.healed');
    },
  },
  videotape: {
    id: 'videotape',
    name: 'Videokazeta',
    icon: '📼',
    tint: '#f2d45c',
  },
  'collar-key': {
    id: 'collar-key',
    name: 'Klíček z obojku',
    icon: '🗝️',
    tint: '#f2d45c',
  },
  'gate-key': {
    id: 'gate-key',
    name: 'Klíč od dveří',
    icon: '🔑',
    tint: '#f2d45c',
  },
  ammo: {
    id: 'ammo',
    name: 'Náboje',
    icon: '•',
    tint: '#f28f5c',
  },
  'battery-cell': {
    id: 'battery-cell',
    name: 'Battery Cell',
    icon: '⚡',
    tint: '#f2d45c',
  },
  wrench: {
    id: 'wrench',
    name: 'Service Wrench',
    icon: '🔧',
    tint: '#8ce0ff',
  },
  keycard: {
    id: 'keycard',
    name: 'Keycard Fragment',
    icon: '🗝️',
    tint: '#c66bff',
  },
};

export function getItem(id) {
  if (!id) return null;
  const item = items[id];
  if (!item) return null;
  const { useHandler, ...rest } = item;
  return { ...rest };
}

export function getItemHandlers() {
  return Object.fromEntries(
    Object.entries(items)
      .filter(([, item]) => typeof item.useHandler === 'function')
      .map(([id, item]) => [id, item.useHandler])
  );
}
