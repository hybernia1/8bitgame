export class Inventory {
  constructor(slots = 6) {
    this.slots = Array(slots).fill(null);
  }

  addItem(item) {
    const emptyIndex = this.slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) return false;
    this.slots[emptyIndex] = item;
    return true;
  }
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
      label.textContent = item.name;
      slot.append(icon, label);
    } else {
      slot.classList.add('inventory-empty');
      slot.innerHTML = `<div class="inventory-icon">·</div><div class="inventory-label">Slot ${index + 1}</div>`;
    }
    grid.appendChild(slot);
  });
}

export function updateInventoryNote(text) {
  const note = document.querySelector('.inventory-note');
  if (!note) return;
  note.textContent = text;
}
