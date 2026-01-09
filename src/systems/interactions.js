import { TILE } from '../core/constants.js';
import { runActions } from '../core/actions.js';
import { evaluateQuestBatch, getActiveQuestSummary, prepareQuestState } from '../core/quests.js';
import { findNearestSafe, SAFE_INTERACT_DISTANCE } from '../entities/safes.js';
export function createInteractionSystem({
  inventory,
  pickups,
  npcs,
  hud,
  state,
  level,
  game,
  renderInventory,
  showNote,
  setObjectives,
  collectNearbyPickups,
  onPickupCollected,
  safes = [],
  onSafeInteract,
  onQuizStart,
}) {
  const SWITCH_INTERACT_DISTANCE = TILE;
  const npcScripts = level.getNpcScripts();
  const rewards = level.getRewards();
  const questConfigs = level.getQuestConfigs();
  const persistentState = state.persistentState ?? (state.persistentState = {});
  const sessionState = state.sessionState ?? (state.sessionState = {});
  let activeNpc = null;
  const questState = prepareQuestState(questConfigs, persistentState.quests ?? (persistentState.quests = {}));
  const flags = persistentState.flags ?? (persistentState.flags = {});
  if (flags.technicianLightOn !== true) {
    const techSwitch = level.getLightSwitches().find((sw) => sw.id === 'technician-switch');
    if (techSwitch?.activated) {
      flags.technicianLightOn = true;
    }
  }
  sessionState.dialogueTime ??= 0;
  sessionState.activeSpeaker ??= '';
  sessionState.activeLine ??= '';
  sessionState.dialogueMeta ??= null;
  sessionState.levelAdvanceQueued ??= false;

  function findNearestLightSwitch(player) {
    let best = null;
    let bestDistance = Infinity;
    level.getLightSwitches().forEach((sw) => {
      const sx = sw.tx * TILE + TILE / 2;
      const sy = sw.ty * TILE + TILE / 2;
      const dist = Math.hypot(player.x - sx, player.y - sy);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = sw;
      }
    });
    return { activeSwitch: best, switchDistance: bestDistance };
  }

  function refreshQuestLog() {
    const summary = getActiveQuestSummary(questConfigs, questState);
    hud.setQuestLog?.(summary);
    if (summary?.progress) {
      hud.setObjectives?.(summary.progress.current ?? 0, summary.progress.total ?? level.getObjectiveTotal());
    }
  }

  function unlockNpcMovement() {
    if (!activeNpc) return;
    if (!Number.isFinite(activeNpc.busyTimer)) {
      activeNpc.busyTimer = 0;
    }
    activeNpc.wanderCooldown = activeNpc.wanderInterval ?? 0;
    activeNpc = null;
  }

  function evaluateQuestCompletion(context = {}) {
    const { silent = false } = context;
    const results = evaluateQuestBatch(questConfigs, questState, {
      ...context,
      flags,
      state,
      inventory,
      objectivesCollected: state.objectivesCollected,
    });

    if (!silent) {
      results.completed.forEach((entry) => {
        if (entry.note) {
          showNote(entry.note);
        }
      });
    }

    refreshQuestLog();
  }

  function clearDialogue() {
    unlockNpcMovement();
    state.activeSpeaker = '';
    state.activeLine = '';
    state.dialogueMeta = null;
    state.dialogueTime = 0;
    hud.hideInteraction();
  }

  function evaluateLineConditions(conditions = []) {
    return conditions.every((cond) => {
      if (cond.flag) {
        const expected = cond.equals ?? true;
        const actual = flags[cond.flag] ?? false;
        return actual === expected;
      }
      if (cond.questComplete) {
        return questState[cond.questComplete]?.completed === true;
      }
      if (cond.questIncomplete) {
        return questState[cond.questIncomplete]?.completed !== true;
      }
      if (cond.hasItem) {
        return inventory.getItemCount(cond.hasItem) > 0;
      }
      return true;
    });
  }

  function pickNpcLine(script) {
    if (!script?.lines?.length) return null;
    return script.lines.find((line) => evaluateLineConditions(line.when));
  }

  function applyStateChanges(nextState = {}) {
    Object.entries(nextState).forEach(([key, value]) => {
      flags[key] = value;
      if (persistentState) {
        persistentState.flags ??= {};
        persistentState.flags[key] = value;
      }
    });
  }

  function applyActions(step) {
    if (!step?.actions && !step?.rewardId) return { success: true };

    const reward = step.rewardId ? rewards[step.rewardId] : undefined;
    const baseActions = Array.isArray(step.actions) ? step.actions : step.actions ? [step.actions] : [];
    const rewardActions = reward?.actions ?? [];
    const actions = [...baseActions, ...rewardActions];

    if (!actions.length) return { success: true, note: reward?.note };

    const result = runActions(
      actions,
      { inventory, renderInventory, level, game, hud, flags, persistentState, sessionState, state },
      reward,
    );
    if (result.success !== false && reward?.note && !result.note) {
      result.note = reward.note;
    }
    return result;
  }

  function handleInteract(player, context) {
    const { nearestNpc, guardCollision } = context;
    const gateState = level.getGateState();
    const gateDistance = gateState ? Math.hypot(gateState.x - player.x, gateState.y - player.y) : Infinity;
    const nearGate = gateState ? gateDistance <= 26 : false;
    const { nearestSafe, safeDistance } = findNearestSafe(safes, player.x, player.y);
    const nearSafe = nearestSafe ? safeDistance <= SAFE_INTERACT_DISTANCE : false;
    const { activeSwitch, switchDistance } = findNearestLightSwitch(player);
    const quizActive = Boolean(sessionState.activeQuiz);

    if (!quizActive && context.interactRequested && activeSwitch && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      const result = level.toggleLightSwitch(activeSwitch.id);
      if (result?.activated) {
        if (activeSwitch.id === 'technician-switch') {
          persistentState.flags.technicianLightOn = true;
        }
        if (Number.isFinite(activeSwitch.timerSeconds) && activeSwitch.timerSeconds > 0) {
          showNote('note.switch.activatedTimed', { name: activeSwitch.name, seconds: activeSwitch.timerSeconds });
        } else {
          showNote('note.switch.activated', { name: activeSwitch.name });
        }
        game?.saveProgress?.({ auto: true });
      } else if (result) {
        showNote('note.switch.deactivated', { name: activeSwitch.name });
      }
    } else if (!quizActive && context.interactRequested && nearSafe) {
      onSafeInteract?.(nearestSafe);
    } else if (!quizActive && context.interactRequested && nearestNpc?.nearby) {
      state.activeSpeaker = nearestNpc.name;
      const script = npcScripts[nearestNpc.id];
      const pickedLine = pickNpcLine(script);
      let dialogue = pickedLine?.dialogue || script?.defaultDialogue || nearestNpc.dialogue || 'dialogue.npcDefault';
      let note = pickedLine?.note;
      let rewardBlocked = false;

      if (pickedLine?.quiz) {
        onQuizStart?.({ npc: nearestNpc, script, line: pickedLine });
        nearestNpc.hasSpoken = true;
        unlockNpcMovement();
        activeNpc = nearestNpc;
        nearestNpc.busyTimer = Number.POSITIVE_INFINITY;
        nearestNpc.wanderTarget = null;
        nearestNpc.wanderCooldown = nearestNpc.wanderInterval ?? 0;
        if (script?.infoNote && !nearestNpc.infoShared) {
          showNote(script.infoNote);
          nearestNpc.infoShared = true;
        }

        state.activeLine = dialogue;
        state.dialogueMeta = { speakerType: 'npc', spriteName: nearestNpc.sprite };
        state.dialogueTime = Number.POSITIVE_INFINITY;
        hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
      } else {
        if (pickedLine?.actions || pickedLine?.rewardId) {
          const rewardResult = applyActions(pickedLine);
          rewardBlocked = rewardResult.success === false;
          if (rewardBlocked) {
            dialogue = rewardResult.blockedDialogue || script?.defaultDialogue || dialogue;
            note = rewardResult.blockedNote ?? note;
          } else if (rewardResult.note) {
            note = rewardResult.note;
          }
        }

        if (pickedLine?.setState && !rewardBlocked) {
          applyStateChanges(pickedLine.setState);
        }

        if (!rewardBlocked && (pickedLine?.actions || pickedLine?.rewardId)) {
          evaluateQuestCompletion({ reason: 'interaction' });
        }

        if (note) {
          showNote(note);
        }

        nearestNpc.hasSpoken = true;
        unlockNpcMovement();
        activeNpc = nearestNpc;
        nearestNpc.busyTimer = Number.POSITIVE_INFINITY;
        nearestNpc.wanderTarget = null;
        nearestNpc.wanderCooldown = nearestNpc.wanderInterval ?? 0;
        if (script?.infoNote && !nearestNpc.infoShared) {
          showNote(script.infoNote);
          nearestNpc.infoShared = true;
        }

        state.activeLine = dialogue;
        state.dialogueMeta = { speakerType: 'npc', spriteName: nearestNpc.sprite };
        state.dialogueTime = Number.POSITIVE_INFINITY;
        hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
      }
    } else if (!quizActive && context.interactRequested && nearGate && gateState && !gateState.locked) {
      state.activeSpeaker = gateState.speaker || 'speaker.gateSystem';
      state.activeLine = gateState.unlockLine || 'dialogue.gateUnlocked';
      const requiredItemId = gateState.requiredItemId || 'gate-key';
      const gateConsumeFlag = gateState.consumeFlag || 'gateKeyUsed';
      if (!flags[gateConsumeFlag]) {
        const consumed = inventory.consumeItem(requiredItemId, 1);
        if (consumed) {
          flags[gateConsumeFlag] = true;
          if (persistentState) {
            persistentState.flags ??= {};
            persistentState.flags[gateConsumeFlag] = true;
          }
          renderInventory(inventory);
          showNote(gateState.consumeNote || 'note.gate.consumeKey');
        }
      }
      state.dialogueTime = Number.POSITIVE_INFINITY;
      state.dialogueMeta = { speakerType: 'system' };
      hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
      if (level?.meta?.id === 'level-2' && !flags.northWingExited) {
        flags.northWingExited = true;
        if (persistentState) {
          persistentState.flags ??= {};
          persistentState.flags.northWingExited = true;
        }
        evaluateQuestCompletion({ reason: 'gate' });
      }
      if (gateState.nextLevelId && !sessionState.levelAdvanceQueued) {
        sessionState.levelAdvanceQueued = true;
        game?.advanceToNextMap?.(gateState.nextLevelId);
      }
    }

    const collected = collectNearbyPickups(player, pickups, inventory, { onCollect: onPickupCollected });
    if (collected.length) {
      const objectiveLoot = collected.filter((pickup) => pickup.objective !== false).length;
      if (objectiveLoot) {
        state.objectivesCollected += objectiveLoot;
      }
      setObjectives(state.objectivesCollected);
      game?.recordObjectives?.(state.objectivesCollected);
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      showNote('note.pickup.collected', { items: names });
      evaluateQuestCompletion({ reason: 'pickup' });
    }

    return {
      gateState,
      nearGate,
      activeSwitch,
      switchDistance,
      guardCollision,
      nearestNpc,
      nearestSafe,
      nearSafe,
    };
  }

  function updateInteractions(player, context) {
    const { nearestNpc, nearestSafe, nearSafe, activeSwitch, switchDistance, nearGate } = context;
    let hasActiveDialogue = Boolean(state.activeLine);
    const npcDialogueActive = hasActiveDialogue && state.dialogueMeta?.speakerType === 'npc';
    let promptType = null;
    let promptTextId = null;
    let promptWorldX = null;
    let promptWorldY = null;
    let promptParams = null;

    if (sessionState.activeQuiz) {
      hud.hideInteraction();
      return { promptType, promptTextId, promptWorldX, promptWorldY };
    }

    if (npcDialogueActive && !nearestNpc?.nearby) {
      clearDialogue();
      hasActiveDialogue = false;
    }

    if (!hasActiveDialogue) {
      state.dialogueMeta = null;
    }
    if (hasActiveDialogue) {
      hud.showDialogue(state.activeSpeaker, state.activeLine, undefined, state.dialogueMeta);
    } else if (nearSafe && nearestSafe) {
      promptType = 'safe';
      promptTextId = nearestSafe.opened ? 'prompt.safeOpened' : 'prompt.safeLocked';
      promptWorldX = nearestSafe.x;
      promptWorldY = nearestSafe.y - (nearestSafe.size ?? TILE) / 2;
    } else if (nearestNpc?.nearby) {
      promptType = 'npc';
      promptTextId = 'prompt.talk';
      promptParams = { name: nearestNpc.name };
      promptWorldX = nearestNpc.x;
      promptWorldY = nearestNpc.y - (nearestNpc.size ?? TILE) / 2;
    } else if (activeSwitch && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      promptType = 'switch';
      promptTextId = activeSwitch.activated ? 'prompt.switchOff' : 'prompt.switchOn';
      promptWorldX = activeSwitch.tx * TILE + TILE / 2;
      promptWorldY = activeSwitch.ty * TILE;
    } else if (nearGate) {
      promptType = 'gate';
      promptTextId = context.gateState?.locked
        ? context.gateState.promptLocked || 'prompt.gateLocked'
        : context.gateState?.promptUnlocked || 'prompt.gateUnlocked';
      promptWorldX = context.gateState?.x ?? null;
      promptWorldY = context.gateState?.y != null ? context.gateState.y - TILE / 2 : null;
    }

    if (!hasActiveDialogue && promptTextId) {
      hud.showWorldPrompt(promptTextId, promptWorldX, promptWorldY, promptParams);
    } else if (!hasActiveDialogue) {
      hud.hideInteraction();
    }

    return { promptType, promptTextId, promptWorldX, promptWorldY };
  }

  evaluateQuestCompletion({ silent: true });
  refreshQuestLog();

  return {
    handleInteract,
    updateInteractions,
  };
}
