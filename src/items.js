export const items = {
  apple: {
    id: 'apple',
    name: 'Jablko',
    icon: '🍎',
    tint: '#f25c5c',
  },
};

export const itemHandlers = {
  apple({ inventory, slotIndex, playerVitals, updateHealthHud, renderInventory, updateInventoryNote }) {
    if (playerVitals.health >= playerVitals.maxHealth) {
      updateInventoryNote?.('Máš plné zdraví, jablko si nech na horší chvíli.');
      return;
    }

    const consumed = inventory.consumeSlot(slotIndex, 1);
    if (!consumed) return;

    playerVitals.health = Math.min(playerVitals.maxHealth, playerVitals.health + 1);
    updateHealthHud?.();
    renderInventory?.(inventory);
    updateInventoryNote?.('Jablko ti doplnilo jeden život.');
  },
};
