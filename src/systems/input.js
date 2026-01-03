import { useInventorySlot } from '../ui/inventory.js';

export function createInputSystem({
  inventory,
  playerVitals,
  updateHealthHud,
  renderInventory,
  showNote,
  handlers,
  onPauseToggle,
}) {
  let interactRequested = false;
  let shootRequested = false;

  function handleInventoryUse(slotIndex) {
    useInventorySlot({
      inventory,
      slotIndex,
      playerVitals,
      updateHealthHud,
      renderInventory,
      showNote,
      handlers,
    });
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      onPauseToggle?.();
      return;
    }
    if (event.key.toLowerCase() === 'e') {
      interactRequested = true;
      return;
    }
    if (event.code === 'Space') {
      shootRequested = true;
      return;
    }
    const slotNumber = Number.parseInt(event.key, 10);
    if (Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= inventory.slots.length) {
      handleInventoryUse(slotNumber - 1);
    }
  }

  function onInventoryClick(event) {
    const slot = event.target.closest('.inventory-slot');
    if (!slot) return;
    const index = Number.parseInt(slot.dataset.index, 10) - 1;
    if (Number.isInteger(index)) {
      handleInventoryUse(index);
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.querySelector('.inventory-grid')?.addEventListener('click', onInventoryClick);

  function destroy() {
    document.removeEventListener('keydown', onKeyDown);
    document.querySelector('.inventory-grid')?.removeEventListener('click', onInventoryClick);
  }

  function consumeInteractRequest() {
    const requested = interactRequested;
    interactRequested = false;
    return requested;
  }

  function consumeShootRequest() {
    const requested = shootRequested;
    shootRequested = false;
    return requested;
  }

  return {
    consumeInteractRequest,
    consumeShootRequest,
    destroy,
  };
}
