import { format } from '../ui/messages.js';

const AVATAR_PATHS = {
  player: 'assets/hero/hero.png',
  npc: 'assets/npc/npc.png',
  hana: 'assets/npc/hana.png',
  jara: 'assets/npc/jara.png',
  caretaker: 'assets/npc/caretaker.png',
  cat: 'assets/npc/cat.png',
  monster: 'assets/npc/monster.png',
};

function applyText(node, text) {
  if (!node) return;
  node.textContent = text;
}

export function createHudSystem(passedElements = {}) {
  const elements = {
    ...passedElements,
  };

  function resolveAvatarPath(meta = {}) {
    if (!meta || !elements.bannerAvatar) return null;
    const { speakerType, spriteName } = meta;
    if (speakerType === 'player') return AVATAR_PATHS.player;
    if (spriteName && AVATAR_PATHS[spriteName]) return AVATAR_PATHS[spriteName];
    if (speakerType === 'npc') return AVATAR_PATHS.npc;
    return null;
  }

  function setDialogueAvatar(meta) {
    if (!elements.banner) return;
    const avatarPath = resolveAvatarPath(meta);
    if (avatarPath) {
      elements.banner.classList.add('has-avatar');
      if (elements.bannerAvatar) {
        elements.bannerAvatar.style.backgroundImage = `url(${avatarPath})`;
      }
    } else {
      elements.banner.classList.remove('has-avatar');
      if (elements.bannerAvatar) {
        elements.bannerAvatar.style.backgroundImage = '';
      }
    }
  }

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
    const safeHp = Math.max(0, Number.isFinite(hp) ? hp : 0);
    const safeMax = Math.max(safeHp, Number.isFinite(max) ? max : safeHp);
    applyText(elements.healthCurrentEl, safeHp);
    applyText(elements.healthTotalEl, safeMax);
    if (elements.healthHeartsEl) {
      const filled = '❤'.repeat(Math.max(0, Math.min(safeHp, safeMax)));
      const empty = '♡'.repeat(Math.max(0, safeMax - safeHp));
      applyText(elements.healthHeartsEl, `${filled}${empty}`);
    }
  }

  function setAmmo(ammo, maxAmmo) {
    const safeAmmo = Math.max(0, Number.isFinite(ammo) ? Math.floor(ammo) : 0);
    const safeMaxAmmo = Number.isFinite(maxAmmo) ? Math.max(0, Math.floor(maxAmmo)) : null;
    const displayAmmo =
      safeMaxAmmo && safeMaxAmmo > 0 ? `${safeAmmo}/${Math.max(safeAmmo, safeMaxAmmo)}` : `${safeAmmo}`;
    applyText(elements.ammoCurrentEl, displayAmmo);
    if (elements.ammoEl) {
      const label =
        safeMaxAmmo && safeMaxAmmo > 0
          ? `Stav nábojů: ${safeAmmo} z ${Math.max(safeAmmo, safeMaxAmmo)}`
          : `Stav nábojů: ${safeAmmo}`;
      elements.ammoEl.setAttribute('aria-label', label);
    }
  }

  function showNote(messageId, params) {
    applyText(elements.inventoryNote, format(messageId, params));
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
    setDialogueAvatar(null);
    showBanner('prompt', format(messageId, params));
  }

  function showDialogue(speakerId, lineId, params, meta) {
    const speaker = format(speakerId, params);
    const line = format(lineId, params);
    if (!elements.banner || !elements.bannerTitle || !elements.bannerBody) return;
    elements.banner.classList.remove('hidden');
    elements.banner.dataset.state = 'dialogue';
    applyText(elements.bannerTitle, speaker);
    applyText(elements.bannerBody, line);
    setDialogueAvatar(meta);
  }

  function hideInteraction() {
    setDialogueAvatar(null);
    hideBanner();
  }

  function setQuestLog(questLog) {
    const { title = '', description = '', progressText = '' } = questLog ?? {};
    applyText(elements.questTitle, title);
    applyText(elements.questDescription, description);
    applyText(elements.questProgress, progressText);
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
    elements.inventoryStatus.classList.remove('hidden');
    const messageKey = collapsed ? 'note.inventory.collapsed' : 'note.inventory.pinnedStatus';
    applyText(elements.inventoryStatus, format(messageKey, { binding: bindingLabel ?? '' }));
  }

  return {
    setLevelTitle,
    setObjectives,
    setHealth,
    setAmmo,
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
