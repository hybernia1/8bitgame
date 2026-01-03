import { TILE } from '../core/constants.js';
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
}) {
  const SWITCH_INTERACT_DISTANCE = TILE;
  const npcScripts = level.getNpcScripts();
  const rewards = level.getRewards();
  const questConfigs = level.getQuestConfigs();
  const questState = state.quests ?? (state.quests = {});
  const flags = state.flags ?? (state.flags = {});

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

  function evaluateQuestCompletion() {
    questConfigs.forEach((quest) => {
      const entry = questState[quest.id] ?? (questState[quest.id] = { completed: false });
      if (entry.completed) return;

      const hasEnough = quest.objectiveCount == null || state.objectivesCollected >= quest.objectiveCount;
      const itemsReady =
        !quest.objectiveItemIds || quest.objectiveItemIds.every((itemId) => inventory.getItemCount(itemId) > 0);

      if (hasEnough && itemsReady) {
        entry.completed = true;
        if (quest.completionNote) {
          showNote(quest.completionNote);
        }
      }
    });
  }

  function evaluateLineConditions(conditions = []) {
    return conditions.every((cond) => {
      if (cond.flag) {
        const expected = cond.equals ?? true;
        const actual = flags[cond.flag] ?? state[cond.flag] ?? false;
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
      state[key] = value;
    });
  }

  function applyReward(rewardId) {
    if (!rewardId) return { success: true };
    const reward = rewards[rewardId];
    if (!reward) return { success: true };

    if (reward.item) {
      const stored = inventory.addItem({ ...reward.item });
      if (!stored) {
        return {
          success: false,
          blockedDialogue: reward.blockedDialogue,
          blockedNote: reward.blockedNote,
        };
      }
      renderInventory(inventory);
    }

    if (reward.actions?.clearObjectives) {
      inventory.clearObjectiveItems();
      renderInventory(inventory);
    }

    if (reward.actions?.unlockGate) {
      level.unlockGate();
      game?.saveProgress?.();
    }

    if (reward.actions?.setAreaName) {
      state.areaName = reward.actions.setAreaName;
    }

    if (typeof reward.actions?.setLevelNumber === 'number') {
      state.levelNumber = reward.actions.setLevelNumber;
    }

    if (reward.actions?.setSubtitle) {
      state.subtitle = reward.actions.setSubtitle;
      hud.setSubtitle?.(state.subtitle);
    }

    if (reward.actions?.setAreaName || typeof reward.actions?.setLevelNumber === 'number') {
      hud.setLevelTitle?.(state.areaName, state.levelNumber ?? 0);
    }

    return { success: true, note: reward.note };
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

      if (pickedLine?.rewardId) {
        const rewardResult = applyReward(pickedLine.rewardId);
        rewardBlocked = !rewardResult.success;
        if (!rewardResult.success) {
          dialogue = rewardResult.blockedDialogue || script?.defaultDialogue || dialogue;
          note = rewardResult.blockedNote ?? note;
        } else if (rewardResult.note) {
          note = rewardResult.note;
        }
      }

      if (pickedLine?.setState && !rewardBlocked) {
        applyStateChanges(pickedLine.setState);
      }

      if (note) {
        showNote(note);
      }

      nearestNpc.hasSpoken = true;
      if (script?.infoNote && !nearestNpc.infoShared) {
        showNote(script.infoNote);
        nearestNpc.infoShared = true;
      }

      state.activeLine = dialogue;
      state.dialogueTime = 4;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
    } else if (context.interactRequested && nearGate && gateState && !gateState.locked) {
      state.activeSpeaker = gateState.speaker || 'speaker.gateSystem';
      state.activeLine = gateState.unlockLine || 'dialogue.gateUnlocked';
      if (!state.gateKeyUsed) {
        const consumed = inventory.consumeItem('gate-key', 1);
        if (consumed) {
          state.gateKeyUsed = true;
          renderInventory(inventory);
          showNote(gateState.consumeNote || 'note.gate.consumeKey');
        }
      }
      state.dialogueTime = 3;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
    }

    const collected = collectNearbyPickups(player, pickups, inventory);
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
      evaluateQuestCompletion();
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

  return {
    handleInteract,
    updateInteractions,
  };
}
