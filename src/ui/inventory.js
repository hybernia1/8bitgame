import { format } from './messages.js';

export class Inventory {
  constructor(slots = 12) {
    this.slots = Array(slots).fill(null);
  }

  addItem(item) {
    if (item.stackable) {
      const existingIndex = this.slots.findIndex((slot) => slot?.id === item.id);
      if (existingIndex !== -1) {
        const existing = this.slots[existingIndex];
        const quantity = item.quantity ?? 1;
        existing.quantity = (existing.quantity ?? 1) + quantity;
        return true;
      }
    }

    const emptyIndex = this.slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return false;

    const quantity = item.quantity ?? (item.stackable ? 1 : undefined);
    this.slots[emptyIndex] = quantity ? { ...item, quantity } : { ...item };
    return true;
  }

  consumeItem(id, amount = 1) {
    const index = this.slots.findIndex((slot) => slot?.id === id);
    if (index === -1) return false;
    return this.consumeSlot(index, amount);
  }

  consumeSlot(index, amount = 1) {
    const slot = this.slots[index];
    if (!slot) return false;

    if (!slot.stackable) {
      this.slots[index] = null;
      return true;
    }

    const remaining = (slot.quantity ?? 1) - amount;
    if (remaining > 0) {
      slot.quantity = remaining;
    } else {
      this.slots[index] = null;
    }

    return true;
  }

  clearObjectiveItems() {
    this.slots = this.slots.map((slot) => {
      if (!slot) return null;
      return slot.objective === true ? null : slot;
    });
  }

  getItemCount(id) {
    const slot = this.slots.find((entry) => entry?.id === id);
    if (!slot) return 0;
    return slot.quantity ?? 1;
  }

  serialize() {
    return this.slots.map((slot) => (slot ? { ...slot } : null));
  }

  restore(slotState = []) {
    const targetSize = this.slots.length;
    const restored = Array.isArray(slotState)
      ? slotState.map((slot) => (slot ? { ...slot } : null))
      : [];

    // Legacy save data may not include all slots; pad or trim for compatibility.
    if (restored.length < targetSize) {
      restored.push(...Array(targetSize - restored.length).fill(null));
    } else if (restored.length > targetSize) {
      restored.length = targetSize;
    }

    this.slots = restored;
  }
}

export function useInventorySlot({
  inventory,
  slotIndex,
  playerVitals,
  updateHealthHud,
  renderInventory,
  showNote,
  handlers,
}) {
  const item = inventory.slots[slotIndex];
  if (!item) {
    showNote?.('note.inventory.emptySlot', { index: slotIndex + 1 });
    return;
  }

  const handler = handlers?.[item.id];
  if (handler) {
    handler({
      inventory,
      slotIndex,
      playerVitals,
      updateHealthHud,
      renderInventory,
      showNote,
    });
    return;
  }

  showNote?.('note.inventory.unusable');
}

export function renderInventory(inventory) {
  const grid = document.querySelector('.inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  inventory.slots.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.index = `${index + 1}`;
    if (item) {
      const icon = document.createElement('div');
      icon.className = 'inventory-icon';
      icon.textContent = item.icon || '◆';
      if (item.tint) {
        icon.style.color = item.tint;
      }
      const label = document.createElement('div');
      label.className = 'inventory-label';
      const quantity = item.quantity ?? 0;
      label.textContent = quantity > 1 ? `${item.name} ×${quantity}` : item.name;
      slot.append(icon, label);
    } else {
      slot.classList.add('inventory-empty');
      slot.innerHTML = `<div class="inventory-icon">·</div><div class="inventory-label">${format(
        'note.inventory.slotLabel',
        { index: index + 1 }
      )}</div>`;
    }
    grid.appendChild(slot);
  });
}
