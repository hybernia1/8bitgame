import { TILE_SCALE } from '../../../core/constants.js';
import { createNpcs } from '../../../entities/npc.js';

function setDialogue(state, hud, speaker, line, meta) {
  state.activeSpeaker = speaker;
  state.activeLine = line;
  state.dialogueMeta = meta ?? null;
  state.dialogueTime = Number.POSITIVE_INFINITY;
  hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
}

export function createRooftopCorridorScript({
  state,
  hud,
  npcs,
  spriteSheet,
  alertLayer,
  level,
  player,
  game,
}) {
  if (!level?.meta || level.meta.id !== 'level-3') return null;

  let elapsed = 0;
  let stepIndex = 0;
  let ended = false;
  let endTimeout = null;
  const { width, height } = level.getDimensions();

  const setAlert = (active, { flashing = false } = {}) => {
    if (!alertLayer) return;
    alertLayer.classList.toggle('hidden', !active);
    alertLayer.classList.toggle('is-active', active);
    alertLayer.classList.toggle('is-flashing', active && flashing);
  };

  const spawnSpiders = () => {
    const placements = [
      { id: 'echo-spider-nw', sprite: 'spider', lethal: false, pursuesPlayer: true, tx: 1, ty: 1 },
      { id: 'echo-spider-ne', sprite: 'spider', lethal: false, pursuesPlayer: true, tx: width - 2, ty: 1 },
      {
        id: 'echo-spider-sw',
        sprite: 'spider',
        lethal: false,
        pursuesPlayer: true,
        tx: 1,
        ty: height - 2,
      },
      {
        id: 'echo-spider-se',
        sprite: 'spider',
        lethal: false,
        pursuesPlayer: true,
        tx: width - 2,
        ty: height - 2,
      },
    ];

    const additions = createNpcs(spriteSheet, { npcs: placements });
    additions.forEach((spider) => {
      spider.wanderRadius = 0;
      spider.wanderInterval = 0;
      spider.chaseSpeed = 48 * TILE_SCALE;
    });
    npcs.push(...additions);
  };

  const endLevel = () => {
    if (ended) return;
    ended = true;
    state.activeSpeaker = 'Ticho';
    state.activeLine = 'Chlad tě polyká. Obraz se trhá...';
    state.dialogueMeta = { speakerType: 'npc' };
    hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
    setAlert(false);
    state.levelAdvanceQueued = true;
    endTimeout = setTimeout(() => {
      game?.advanceToNextMap?.('level-4');
    }, 1500);
  };

  const steps = [
    () => {
      setDialogue(state, hud, 'Ty', 'Proč stojím uprostřed? Nikde žádné dveře...', { speakerType: 'player' });
    },
    () => {
      setDialogue(state, hud, 'Ty', 'Musí existovat východ. Tohle nemůže být konec chodby.', {
        speakerType: 'player',
      });
    },
    () => {
      setDialogue(state, hud, 'Hlasy', '…pojď blíž…', { speakerType: 'npc' });
      setAlert(true, { flashing: false });
    },
    () => {
      setAlert(true, { flashing: true });
      setDialogue(state, hud, 'Ty', 'Ne! Prosím… ať to skončí.', { speakerType: 'player' });
    },
    () => {
      setAlert(false);
      setDialogue(state, hud, 'Ty', 'Je to pryč? Nebo jen čeká…', { speakerType: 'player' });
    },
    () => {
      spawnSpiders();
      setDialogue(state, hud, 'Ty', 'Stíny se hýbou. Pavouci se sunou ke mně!', { speakerType: 'player' });
    },
    endLevel,
  ];

  const schedule = [
    { at: 0.4, step: 0 },
    { at: 3.2, step: 1 },
    { at: 6.1, step: 2 },
    { at: 8.2, step: 3 },
    { at: 11.5, step: 4 },
    { at: 13.2, step: 5 },
    { at: 18, step: 6 },
  ];

  return {
    update(dt) {
      if (ended) return;
      elapsed += dt;
      while (stepIndex < schedule.length && elapsed >= schedule[stepIndex].at) {
        const actionIndex = schedule[stepIndex].step;
        steps[actionIndex]?.();
        stepIndex += 1;
      }
    },
    destroy() {
      setAlert(false);
      if (endTimeout) {
        clearTimeout(endTimeout);
        endTimeout = null;
      }
    },
  };
}
