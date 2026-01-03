const actionRegistry = new Map();

export function registerActionType(type, handler) {
  if (!type || typeof handler !== 'function') return;
  actionRegistry.set(type, handler);
}

function normalizeList(actions) {
  if (!actions) return [];
  return Array.isArray(actions) ? actions : [actions];
}

export function runActions(actions, context = {}, rewardContext = {}) {
  const sequence = normalizeList(actions);
  let note = rewardContext.note;

  for (const action of sequence) {
    const handler = actionRegistry.get(action?.type);
    if (!handler) continue;

    const result = handler(action, context) || {};
    note = result.note ?? note;

    if (result.success === false) {
      return {
        success: false,
        blockedDialogue: result.blockedDialogue ?? rewardContext.blockedDialogue,
        blockedNote: result.blockedNote ?? rewardContext.blockedNote,
        note,
      };
    }
  }

  return { success: true, note };
}

function registerDefaults() {
  registerActionType('giveItem', (action, { inventory, renderInventory }) => {
    if (!action?.item) return { success: true };
    const stored = inventory?.addItem?.({ ...action.item });
    if (!stored) {
      return {
        success: false,
        blockedDialogue: action.blockedDialogue,
        blockedNote: action.blockedNote,
      };
    }
    renderInventory?.(inventory);
    return { success: true, note: action.note };
  });

  registerActionType('unlock', (action, { level, game }) => {
    level?.unlock?.(action.targetId);
    game?.saveProgress?.({ auto: true });
    return { success: true, note: action.note };
  });

  registerActionType('clearObjectives', (_action, { inventory, renderInventory }) => {
    inventory?.clearObjectiveItems?.();
    renderInventory?.(inventory);
    return { success: true };
  });

  registerActionType('setFlag', (action, { flags, persistentState }) => {
    if (!action?.flag) return { success: true };
    const value = action.value ?? true;
    const targetFlags = flags ?? persistentState?.flags;
    if (targetFlags) {
      targetFlags[action.flag] = value;
    }
    return { success: true, note: action.note };
  });

  registerActionType('setArea', (action, { state, hud }) => {
    if (!action?.name) return { success: true };
    if (state) {
      state.areaName = action.name;
    }
    hud?.setLevelTitle?.(action.name, state?.levelNumber ?? 0);
    return { success: true };
  });

  registerActionType('setLevelNumber', (action, { state, hud }) => {
    if (typeof action?.value !== 'number') return { success: true };
    if (state) {
      state.levelNumber = action.value;
    }
    hud?.setLevelTitle?.(state?.areaName ?? 'Unknown Sector', action.value);
    return { success: true };
  });

  registerActionType('setSubtitle', (action, { state, hud }) => {
    if (!action?.value) return { success: true };
    if (state) {
      state.subtitle = action.value;
    }
    hud?.setSubtitle?.(action.value);
    return { success: true };
  });

  registerActionType('playCutscene', (action, { hud }) => {
    if (!action?.id) return { success: true };
    hud?.showToast?.('Přehrávám střih: ' + action.id);
    return { success: true };
  });
}

registerDefaults();
