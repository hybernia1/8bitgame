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

  let questBindingLabel = 'I';
  let questVisible = false;

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

  function setAmmo(ammo) {
    const safeAmmo = Math.max(0, Number.isFinite(ammo) ? Math.floor(ammo) : 0);
    applyText(elements.ammoCurrentEl, `${safeAmmo}`);
    if (elements.ammoEl) {
      elements.ammoEl.setAttribute('aria-label', `Stav nábojů: ${safeAmmo}`);
    }
  }

  function setStress(stress, max) {
    const safeStress = Math.max(0, Number.isFinite(stress) ? Math.floor(stress) : 0);
    const safeMax = Math.max(safeStress, Number.isFinite(max) ? Math.floor(max) : safeStress);
    applyText(elements.stressCurrentEl, `${safeStress}`);
    applyText(elements.stressTotalEl, `/${safeMax}`);
    if (elements.stressEl) {
      elements.stressEl.setAttribute('aria-label', `Stav stresu: ${safeStress} z ${safeMax}`);
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

  function resolveWorldPromptPosition(worldX, worldY) {
    const camera = elements.camera ?? { x: 0, y: 0 };
    const canvas = elements.canvas;
    const hudLayer = elements.hudLayer;
    const screenX = (Number.isFinite(worldX) ? worldX : 0) - (camera?.x ?? 0);
    const screenY = (Number.isFinite(worldY) ? worldY : 0) - (camera?.y ?? 0);
    if (!canvas || !hudLayer || !canvas.getBoundingClientRect || !hudLayer.getBoundingClientRect) {
      return { x: screenX, y: screenY };
    }
    const canvasRect = canvas.getBoundingClientRect();
    const hudRect = hudLayer.getBoundingClientRect();
    const hudStyle = window.getComputedStyle?.(hudLayer);
    const paddingLeft = Number.parseFloat(hudStyle?.paddingLeft ?? '0') || 0;
    const paddingTop = Number.parseFloat(hudStyle?.paddingTop ?? '0') || 0;
    const scaleX = hudLayer.offsetWidth ? hudRect.width / hudLayer.offsetWidth : 1;
    const scaleY = hudLayer.offsetHeight ? hudRect.height / hudLayer.offsetHeight : 1;
    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const relativeX = (screenX / canvasWidth) * canvasRect.width + (canvasRect.left - hudRect.left);
    const relativeY = (screenY / canvasHeight) * canvasRect.height + (canvasRect.top - hudRect.top);
    return {
      x: relativeX / scaleX - paddingLeft,
      y: relativeY / scaleY - paddingTop,
    };
  }

  function showWorldPrompt(messageId, worldX, worldY, params) {
    if (!elements.interactionBubble || !elements.interactionBubbleText) return;
    const bubble = elements.interactionBubble;
    applyText(elements.interactionBubbleText, format(messageId, params));
    bubble.classList.remove('hidden');
    hideBanner();
    const { x, y } = resolveWorldPromptPosition(worldX, worldY);
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
  }

  function hideWorldPrompt() {
    if (!elements.interactionBubble) return;
    elements.interactionBubble.classList.add('hidden');
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
    hideWorldPrompt();
  }

  function hideInteraction() {
    setDialogueAvatar(null);
    hideBanner();
    hideWorldPrompt();
  }

  function setQuestLog(questLog) {
    const { title = '', description = '', progressText = '' } = questLog ?? {};
    applyText(elements.questTitle, title);
    applyText(elements.questDescription, description);
    applyText(elements.questProgress, progressText);
  }

  function setQuestVisibility(visible) {
    const expanded = Boolean(visible);
    questVisible = expanded;
    elements.questLog?.classList.toggle('is-collapsed', !expanded);
    elements.questLog?.setAttribute?.('aria-hidden', expanded ? 'false' : 'true');
    if (elements.questToggle) {
      elements.questToggle.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      const bindingText = questBindingLabel ? ` (${questBindingLabel})` : '';
      const showLabel = `Zobrazit úkol${bindingText}`;
      const hideLabel = `Skrýt úkol${bindingText}`;
      elements.questToggle.setAttribute('aria-label', expanded ? hideLabel : showLabel);
      elements.questToggle.setAttribute('title', expanded ? hideLabel : showLabel);
    }
  }

  function setQuestBindingLabel(bindingLabel) {
    if (bindingLabel) {
      questBindingLabel = bindingLabel;
    }
    setQuestVisibility(questVisible);
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

  return {
    setLevelTitle,
    setObjectives,
    setHealth,
    setAmmo,
    setStress,
    setSubtitle,
    setControlsHint,
    setQuestLog,
    setQuestVisibility,
    setQuestBindingLabel,
    showNote,
    showToast,
    showSaveToast,
    hideToast,
    showPrompt,
    showWorldPrompt,
    showDialogue,
    hideWorldPrompt,
    hideInteraction,
    setInventoryBindingHint,
  };
}
