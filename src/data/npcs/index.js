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
  },
  'key-guard': {
    id: 'key-guard',
    name: 'Hlídač Klíče',
    sprite: 'monster',
    dialogue: 'Stůj! Klíč tady nikdo neukradne.',
    speed: 50,
    lethal: true,
    health: 3,
  },
  cat: {
    id: 'cat',
    name: 'Kočka',
    sprite: 'cat',
    speed: 28,
    wanderRadius: TILE * 3,
    wanderInterval: 0.8,
    dialogue: 'Kočka se nechá podrbat na bříšku. *purr*',
  },
  'recording-cabinet': {
    id: 'recording-cabinet',
    name: 'Záznamová skříň',
    sprite: 'decor.console',
    animationBase: 'decor.console',
    dialogue: 'Skříň je plná prázdných šuplíků.',
  },
  'vcr-player': {
    id: 'vcr-player',
    name: 'Přehrávač',
    sprite: 'decor.console',
    animationBase: 'decor.console',
    dialogue: 'Bez kazety přehrávač nepomůže.',
  },
  spider: {
    id: 'spider',
    name: 'Pavouk',
    sprite: 'spider',
    lethal: true,
    wanderRadius: TILE * 4,
    wanderInterval: 1.2,
  },
  doctor: {
    id: 'doctor',
    name: 'Doktor Viktor',
    sprite: 'npc',
    dialogue: 'Doktor Viktor si zapisuje tvůj puls a prohlíží nástroje.',
  },
  quizmaster: {
    id: 'quizmaster',
    name: 'Archivářka Nora',
    sprite: 'npc',
    dialogue: 'Archivářka Nora drží tablet a čeká, až odpovíš na kontrolní otázky.',
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
