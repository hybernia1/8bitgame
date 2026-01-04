import { TILE } from '../core/constants.js';
import { runActions } from '../core/actions.js';
import { evaluateQuestBatch, getActiveQuestSummary, prepareQuestState } from '../core/quests.js';
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
}) {
  const SWITCH_INTERACT_DISTANCE = TILE;
  const npcScripts = level.getNpcScripts();
  const rewards = level.getRewards();
  const questConfigs = level.getQuestConfigs();
  const persistentState = state.persistentState ?? (state.persistentState = {});
  const sessionState = state.sessionState ?? (state.sessionState = {});
  const questState = prepareQuestState(questConfigs, persistentState.quests ?? (persistentState.quests = {}));
  const flags = persistentState.flags ?? (persistentState.flags = {});
  sessionState.dialogueTime ??= 0;
  sessionState.activeSpeaker ??= '';
  sessionState.activeLine ??= '';
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
      { inventory, renderInventory, level, game, hud, flags, persistentState, sessionState },
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
    const { activeSwitch, switchDistance } = findNearestLightSwitch(player);

    if (context.interactRequested && activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      const toggled = level.activateLightSwitch(activeSwitch.id);
      if (toggled) {
        showNote('note.switch.activated', { name: activeSwitch.name });
        game?.saveProgress?.({ auto: true });
      } else {
        showNote('note.switch.alreadyOn');
      }
    } else if (context.interactRequested && nearestNpc?.nearby) {
      state.activeSpeaker = nearestNpc.name;
      const script = npcScripts[nearestNpc.id];
      const pickedLine = pickNpcLine(script);
      let dialogue = pickedLine?.dialogue || script?.defaultDialogue || nearestNpc.dialogue || 'dialogue.npcDefault';
      let note = pickedLine?.note;
      let rewardBlocked = false;

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
      const dialogueDuration = 4;
      nearestNpc.busyTimer = Math.max(nearestNpc.busyTimer ?? 0, dialogueDuration);
      nearestNpc.wanderTarget = null;
      nearestNpc.wanderCooldown = nearestNpc.wanderInterval ?? 0;
      if (script?.infoNote && !nearestNpc.infoShared) {
        showNote(script.infoNote);
        nearestNpc.infoShared = true;
      }

      state.activeLine = dialogue;
      state.dialogueTime = dialogueDuration;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
    } else if (context.interactRequested && nearGate && gateState && !gateState.locked) {
      state.activeSpeaker = gateState.speaker || 'speaker.gateSystem';
      state.activeLine = gateState.unlockLine || 'dialogue.gateUnlocked';
      if (!flags.gateKeyUsed) {
        const consumed = inventory.consumeItem('gate-key', 1);
        if (consumed) {
          flags.gateKeyUsed = true;
          renderInventory(inventory);
          showNote(gateState.consumeNote || 'note.gate.consumeKey');
        }
      }
      state.dialogueTime = 3;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
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
    };
  }

  function updateInteractions(player, context) {
    const { nearestNpc, activeSwitch, switchDistance, nearGate } = context;
    if (state.dialogueTime > 0) {
      state.dialogueTime -= context.dt;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
    } else if (nearestNpc?.nearby) {
      hud.showPrompt('prompt.talk', { name: nearestNpc.name });
    } else if (activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      hud.showPrompt('prompt.switch');
    } else if (nearGate) {
      if (context.gateState?.locked) {
        hud.showPrompt(context.gateState.promptLocked || 'prompt.gateLocked');
      } else {
        hud.showPrompt(context.gateState?.promptUnlocked || 'prompt.gateUnlocked');
      }
    } else {
      hud.hideInteraction();
    }
  }

  evaluateQuestCompletion({ silent: true });
  refreshQuestLog();

  return {
    handleInteract,
    updateInteractions,
  };
}
