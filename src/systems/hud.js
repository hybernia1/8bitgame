import { format } from '../ui/messages.js';

const elements = {
  hudTitle: document.querySelector('.level-title'),
  hudSubtitle: document.querySelector('.subtitle'),
  objectivesCollectedEl: document.querySelector('[data-objectives-collected]'),
  objectivesTotalEl: document.querySelector('[data-objectives-total]'),
  healthCurrentEl: document.querySelector('.hud-health-current'),
  healthTotalEl: document.querySelector('.hud-health-total'),
  inventoryNote: document.querySelector('.inventory-note'),
  banner: document.querySelector('.interaction-banner'),
  bannerTitle: document.querySelector('.interaction-title'),
  bannerBody: document.querySelector('.interaction-text'),
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

  return {
    setLevelTitle,
    setObjectives,
    setHealth,
    setSubtitle,
    showNote,
    showPrompt,
    showDialogue,
    hideInteraction,
  };
}
