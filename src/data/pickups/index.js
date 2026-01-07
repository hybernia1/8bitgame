const pickupPresets = {
  ammo: {
    id: 'ammo',
    name: 'Náboje',
    icon: '•',
    tint: '#f28f5c',
    stackable: true,
    storeInInventory: false,
    objective: false,
  },
  apple: {
    id: 'apple',
    name: 'Jablko',
    icon: '🍎',
    tint: '#f25c5c',
    objective: false,
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
