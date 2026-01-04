import { TILE } from '../../core/constants.js';

const npcPresets = {
  mayor: {
    id: 'mayor',
    name: 'Starostka Hana',
    sprite: 'hana',
    dialogue: 'Hana ztiší hlas: „Potřebuji tě tady. Jde o tři ztracené děti.“',
  },
  caretaker: {
    id: 'caretaker',
    name: 'Správce Laboratoře',
    sprite: 'caretaker',
    dialogue: 'Správce šeptá: „Sežeň články a nářadí. Tma tu nesmí vyhrát.“',
  },
  technician: {
    id: 'technician',
    name: 'Technik Jára',
    sprite: 'jara',
    dialogue: 'Jára si drží baterku u hrudi: „Potřebujeme světlo, jinak jsme slepí.“',
    info: 'Technik Jára ti pošeptal: "V rohu skladiště u zdi zůstal energoblok, zkus ho vzít."',
  },
  cat: {
    id: 'cat',
    name: 'Kočka',
    sprite: 'cat',
    speed: 28,
    wanderRadius: TILE * 3,
    wanderInterval: 0.8,
    dialogue: 'Podrbat na bříšku! *prrr*',
  },
};

function clonePreset(id) {
  const preset = npcPresets[id];
  if (!preset) {
    throw new Error(`Unknown NPC preset "${id}"`);
  }
  return { ...preset };
}

export function placeNpc(id, tx, ty, overrides = {}) {
  const base = clonePreset(id);
  return {
    ...base,
    ...(Number.isFinite(tx) && Number.isFinite(ty) ? { tx, ty } : {}),
    ...overrides,
  };
}

export function getNpcPresets() {
  return { ...npcPresets };
}
