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
  if (!id) return {};
  const preset = npcPresets[id];
  if (!preset) {
    throw new Error(`Unknown NPC preset "${id}"`);
  }
  return { ...preset };
}

function derivePlacementConfig(presetIdOrConfig, tx, ty, overrides = {}) {
  if (typeof presetIdOrConfig === 'object') {
    return { ...presetIdOrConfig };
  }
  return { presetId: presetIdOrConfig, tx, ty, ...overrides };
}

export function placeNpc(presetIdOrConfig, tx, ty, overrides = {}) {
  const config = derivePlacementConfig(presetIdOrConfig, tx, ty, overrides);
  const { presetId, preset, script, scriptId, rewards, ...rest } = config;
  const base = preset ? { ...preset } : clonePreset(presetId ?? rest.id);
  const npc = {
    ...base,
    ...(Number.isFinite(config.tx) ? { tx: config.tx } : {}),
    ...(Number.isFinite(config.ty) ? { ty: config.ty } : {}),
    ...rest,
  };

  if (script) {
    npc.script = { id: script.id ?? npc.id, ...script };
  } else if (scriptId) {
    npc.scriptId = scriptId;
  }

  if (rewards) {
    npc.rewards = rewards;
  }

  return npc;
}

export function buildNpcPackage(npcs = []) {
  const placements = [];
  const scripts = {};
  const rewards = {};

  npcs.forEach((npc) => {
    const { script, scriptId, rewards: npcRewards, ...placement } = npc;
    placements.push(placement);

    const resolvedScriptId = script?.id ?? scriptId ?? placement.id;
    if (script) {
      scripts[resolvedScriptId] = script;
    }

    Object.entries(npcRewards ?? {}).forEach(([id, reward]) => {
      rewards[id] = reward;
    });
  });

  return { placements, scripts, rewards };
}

export function getNpcPresets() {
  return { ...npcPresets };
}
