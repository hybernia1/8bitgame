import { format } from './messages.js';

function getSafeDomRefs(root) {
  if (!root) return {};
  return {
    safePanel: root.querySelector('[data-safe-panel]'),
    safeForm: root.querySelector('[data-safe-form]'),
    safeTitle: root.querySelector('[data-safe-title]'),
    safeDescription: root.querySelector('[data-safe-description]'),
    safeInput: root.querySelector('[data-safe-input]'),
    safeSubmit: root.querySelector('[data-safe-submit]'),
    safeCancel: root.querySelector('[data-safe-cancel]'),
    safeFeedback: root.querySelector('[data-safe-feedback]'),
  };
}

export function createSafePanel({ documentRoot } = {}) {
  const refs = getSafeDomRefs(documentRoot);
  let activeSafe = null;
  let dependencies = {
    inventory: null,
    renderInventory: null,
    showNote: null,
    saveProgress: null,
  };

  const setSafeFeedback = (messageId, params) => {
    if (!refs.safeFeedback) return;
    if (!messageId) {
      refs.safeFeedback.textContent = '';
      return;
    }
    refs.safeFeedback.textContent = format(messageId, params);
  };

  const hideSafePanel = () => {
    if (refs.safePanel) {
      refs.safePanel.classList.add('hidden');
      refs.safePanel.setAttribute('aria-hidden', 'true');
    }
    activeSafe = null;
    setSafeFeedback();
  };

  const grantSafeReward = (safe) => {
    const { inventory, renderInventory } = dependencies;
    if (!safe?.reward || safe.rewardClaimed) {
      return { granted: false, note: safe?.emptyNote ?? 'note.safe.empty' };
    }
    const rewardItem = { ...safe.reward };
    const stored = inventory?.addItem?.(rewardItem);
    if (!stored) {
      return {
        granted: false,
        blocked: true,
        note: 'note.safe.inventoryFull',
        params: { item: rewardItem.name ?? rewardItem.id ?? 'loot' },
      };
    }
    safe.rewardClaimed = true;
    renderInventory?.(inventory);
    return {
      granted: true,
      note: safe.rewardNote ?? 'note.safe.itemReceived',
      params: { item: rewardItem.name ?? rewardItem.id ?? 'loot' },
    };
  };

  const showSafePanel = (targetSafe) => {
    if (!targetSafe || !refs.safePanel || !refs.safeInput) return;
    activeSafe = targetSafe;
    refs.safePanel.classList.remove('hidden');
    refs.safePanel.setAttribute('aria-hidden', 'false');
    const digits = Math.max(1, targetSafe.codeLength ?? 4);
    if (refs.safeTitle) {
      refs.safeTitle.textContent = targetSafe.name ?? 'Sejf';
    }
    if (refs.safeDescription) {
      refs.safeDescription.textContent = format('note.safe.enterCode', { digits });
    }
    refs.safeInput.value = '';
    refs.safeInput.maxLength = digits;
    refs.safeInput.setAttribute('aria-label', format('note.safe.enterCode', { digits }));
    setSafeFeedback();
    refs.safeInput.focus?.({ preventScroll: true });
  };

  const handleSafeSubmit = (event) => {
    event?.preventDefault?.();
    if (!activeSafe) {
      hideSafePanel();
      return;
    }
    const digits = Math.max(1, activeSafe.codeLength ?? 4);
    const entered = (refs.safeInput?.value ?? '').trim();
    const numericEntry = entered.replace(/\D/g, '');
    if (numericEntry.length !== digits) {
      setSafeFeedback('note.safe.enterCode', { digits });
      return;
    }
    const normalized = numericEntry.padStart(digits, '0');
    const expected = (activeSafe.code ?? '').padStart(digits, '0');
    if (normalized !== expected) {
      setSafeFeedback('note.safe.wrongCode');
      return;
    }
    activeSafe.opened = true;
    const rewardResult = grantSafeReward(activeSafe);
    const noteId =
      rewardResult.note ??
      (rewardResult.granted ? 'note.safe.itemReceived' : activeSafe.emptyNote ?? 'note.safe.empty');
    dependencies.showNote?.(noteId, rewardResult.params);
    if (rewardResult.blocked) {
      setSafeFeedback(rewardResult.note, rewardResult.params);
      return;
    }
    setSafeFeedback('note.safe.unlocked');
    dependencies.saveProgress?.({ auto: true });
    hideSafePanel();
  };

  const handleSafeCancelClick = (event) => {
    event?.preventDefault?.();
    hideSafePanel();
  };

  const handleSafeInteract = (targetSafe) => {
    if (!targetSafe) return;
    if (targetSafe.opened) {
      if (targetSafe.reward && !targetSafe.rewardClaimed) {
        const rewardResult = grantSafeReward(targetSafe);
        const noteId = rewardResult.note ?? 'note.safe.itemReceived';
        dependencies.showNote?.(noteId, rewardResult.params);
        if (!rewardResult.blocked) {
          dependencies.saveProgress?.({ auto: true });
        }
        return;
      }
      const messageId = targetSafe.emptyNote ?? 'note.safe.empty';
      dependencies.showNote?.(messageId);
      return;
    }
    showSafePanel(targetSafe);
  };

  const init = (nextDependencies = {}) => {
    dependencies = { ...dependencies, ...nextDependencies };
    refs.safeForm?.addEventListener?.('submit', handleSafeSubmit);
    refs.safeSubmit?.addEventListener?.('click', handleSafeSubmit);
    refs.safeCancel?.addEventListener?.('click', handleSafeCancelClick);
  };

  const cleanup = () => {
    refs.safeForm?.removeEventListener?.('submit', handleSafeSubmit);
    refs.safeSubmit?.removeEventListener?.('click', handleSafeSubmit);
    refs.safeCancel?.removeEventListener?.('click', handleSafeCancelClick);
    hideSafePanel();
  };

  return {
    init,
    cleanup,
    hide: hideSafePanel,
    handleSafeInteract,
  };
}
