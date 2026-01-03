import { hideInteraction, showDialogue, showPrompt } from '../ui/interaction.js';
export function createHudSystem({
  hudTitle,
  objectiveTotal,
  objectivesCollectedEl,
  objectivesTotalEl,
  healthCurrentEl,
  healthTotalEl,
}) {
  function updateObjectiveHud(objectivesCollected) {
    if (objectivesCollectedEl) {
      objectivesCollectedEl.textContent = objectivesCollected;
    }
    if (objectivesTotalEl) {
      objectivesTotalEl.textContent = objectiveTotal;
    }
  }

  function updateHealthHud(playerVitals) {
    if (healthCurrentEl) healthCurrentEl.textContent = playerVitals.health;
    if (healthTotalEl) healthTotalEl.textContent = playerVitals.maxHealth;
  }

  function updateAreaTitle(areaName, level = 0) {
    if (!hudTitle) return;
    hudTitle.textContent = `Level ${level}: ${areaName}`;
  }

  return {
    updateObjectiveHud,
    updateHealthHud,
    updateAreaTitle,
    showPrompt,
    showDialogue,
    hideInteraction,
  };
}
