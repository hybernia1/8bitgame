import { format } from '../ui/messages.js';

const elements = {
  hudTitle: document.querySelector('.level-title'),
  hudSubtitle: document.querySelector('.subtitle'),
  objectivesCollectedEl: document.querySelector('[data-objectives-collected]'),
  objectivesTotalEl: document.querySelector('[data-objectives-total]'),
  questTitle: document.querySelector('[data-quest-title]'),
  questDescription: document.querySelector('[data-quest-description]'),
  questProgress: document.querySelector('[data-quest-progress]'),
  healthCurrentEl: document.querySelector('.hud-health-current'),
  healthTotalEl: document.querySelector('.hud-health-total'),
  inventoryNote: document.querySelector('[data-inventory-note]'),
  inventoryBinding: document.querySelector('[data-inventory-binding]'),
  inventoryStatus: document.querySelector('[data-inventory-status]'),
  toast: document.querySelector('.hud-toast'),
  banner: document.querySelector('.interaction-banner'),
  bannerTitle: document.querySelector('.interaction-title'),
  bannerBody: document.querySelector('.interaction-text'),
  hudSubtitle: document.querySelector('[data-controls-hint]') ?? document.querySelector('.subtitle'),
  pauseBindings: document.querySelector('[data-pause-bindings]'),
};

function applyText(node, text) {
  if (!node) return;
  node.textContent = text;
}

function showBanner(state, bodyText) {
  if (!elements.banner || !elements.bannerTitle || !elements.bannerBody) return;
  elements.banner.classList.remove('hidden');
  elements.banner.dataset.state = state;
  applyText(elements.bannerTitle, format('interaction.title'));
  applyText(elements.bannerBody, bodyText);
}

function hideBanner() {
  if (!elements.banner) return;
  elements.banner.classList.add('hidden');
  elements.banner.dataset.state = 'hidden';
}

export function createHudSystem() {
  let cachedObjectivesTotal = 0;
  let toastTimer = null;

  function setLevelTitle(areaName, level = 0) {
    applyText(elements.hudTitle, format('hud.levelTitle', { name: areaName, level }));
  }

  function setSubtitle(subtitleIdOrText, params) {
    if (!subtitleIdOrText) {
      applyText(elements.hudSubtitle, '');
      return;
    }
    applyText(elements.hudSubtitle, format(subtitleIdOrText, params));
  }

  function setObjectives(collected = 0, total = cachedObjectivesTotal) {
    cachedObjectivesTotal = total ?? cachedObjectivesTotal;
    applyText(elements.objectivesCollectedEl, collected);
    applyText(elements.objectivesTotalEl, cachedObjectivesTotal);
  }

  function setHealth(hp, max) {
    applyText(elements.healthCurrentEl, hp);
    applyText(elements.healthTotalEl, max);
  }

  function showNote(messageId, params) {
    applyText(elements.inventoryNote, format(messageId, params));
  }

  function showToast(messageId, params, duration = 2000) {
    if (!elements.toast) return;
    applyText(elements.toast, format(messageId, params));
    elements.toast.classList.remove('hidden');
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      elements.toast?.classList.add('hidden');
    }, duration);
  }

  function hideToast() {
    if (!elements.toast) return;
    elements.toast.classList.add('hidden');
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showSaveToast(messageId, params) {
    showToast(messageId, params, 2200);
  }

  function showPrompt(messageId, params) {
    showBanner('prompt', format(messageId, params));
  }

  function showDialogue(speakerId, lineId, params) {
    const speaker = format(speakerId, params);
    const line = format(lineId, params);
    if (!elements.banner || !elements.bannerTitle || !elements.bannerBody) return;
    elements.banner.classList.remove('hidden');
    elements.banner.dataset.state = 'dialogue';
    applyText(elements.bannerTitle, speaker);
    applyText(elements.bannerBody, line);
  }

  function hideInteraction() {
    hideBanner();
  }

  function setQuestLog({ title, description, progressText } = {}) {
    applyText(elements.questTitle, title ?? '');
    applyText(elements.questDescription, description ?? '');
    applyText(elements.questProgress, progressText ?? '');
  }

  function setControlsHint({ interact, shoot, inventory, pause } = {}) {
    if (!elements.hudSubtitle && !elements.pauseBindings) return;
    const text = format('hud.controls', {
      interact: interact ?? '',
      shoot: shoot ?? '',
      inventory: inventory ?? '',
      pause: pause ?? '',
    });
    applyText(elements.hudSubtitle, text);
    applyText(elements.pauseBindings, text);
  }

  function setInventoryBindingHint(bindingLabel) {
    applyText(elements.inventoryBinding, format('note.inventory.toggle', { binding: bindingLabel ?? '' }));
  }

  function setInventoryStatus(collapsed, bindingLabel) {
    if (!elements.inventoryStatus) return;
    if (!collapsed) {
      elements.inventoryStatus.classList.add('hidden');
      applyText(elements.inventoryStatus, '');
      return;
    }
    elements.inventoryStatus.classList.remove('hidden');
    applyText(elements.inventoryStatus, format('note.inventory.collapsed', { binding: bindingLabel ?? '' }));
  }

  return {
    setLevelTitle,
    setObjectives,
    setHealth,
    setSubtitle,
    setControlsHint,
    setQuestLog,
    showNote,
    showToast,
    showSaveToast,
    hideToast,
    showPrompt,
    showDialogue,
    hideInteraction,
    setInventoryBindingHint,
    setInventoryStatus,
  };
}
