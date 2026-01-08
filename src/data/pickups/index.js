const pickupPresets = {
  ammo: {
    id: 'ammo',
    stackable: true,
    storeInInventory: false,
    objective: false,
  },
  apple: {
    id: 'apple',
    objective: false,
  },
  'battery-cell': {
    id: 'battery-cell',
    objective: true,
  },
  wrench: {
    id: 'wrench',
    objective: true,
  },
  keycard: {
    id: 'keycard',
    objective: true,
  },
};

function clonePreset(id) {
  if (!id) return {};
  const preset = pickupPresets[id];
  if (!preset) {
    throw new Error(`Unknown pickup preset "${id}"`);
  }
  return { ...preset };
}

function derivePlacementConfig(presetIdOrConfig, tx, ty, overrides = {}) {
  if (typeof presetIdOrConfig === 'object') {
    return { ...presetIdOrConfig };
  }
  return { presetId: presetIdOrConfig, tx, ty, ...overrides };
}

export function placePickup(presetIdOrConfig, tx, ty, overrides = {}) {
  const config = derivePlacementConfig(presetIdOrConfig, tx, ty, overrides);
  const { presetId, preset, ...rest } = config;
  const base = preset ? { ...preset } : clonePreset(presetId ?? rest.id);
  return {
    ...base,
    ...(Number.isFinite(config.tx) ? { tx: config.tx } : {}),
    ...(Number.isFinite(config.ty) ? { ty: config.ty } : {}),
    ...rest,
  };
}

export function getPickupPresets() {
  return { ...pickupPresets };
}

export function getPickupPreset(id) {
  if (!id) return null;
  return pickupPresets[id] ? { ...pickupPresets[id] } : null;
}
