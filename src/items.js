export const items = {
  apple: {
    id: 'apple',
    name: 'Jablko',
    icon: '🍎',
    tint: '#f25c5c',
  },
};

export const itemHandlers = {
  apple({ inventory, slotIndex, playerVitals, updateHealthHud, renderInventory, showNote }) {
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
};
