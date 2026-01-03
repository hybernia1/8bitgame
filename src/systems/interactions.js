import { TILE } from '../core/constants.js';
import { items } from '../items.js';
import { getGateState, unlockGateToNewMap, activateLightSwitch, getLightSwitches } from '../world/level.js';

export function createInteractionSystem({
  inventory,
  pickups,
  npcs,
  hud,
  state,
  renderInventory,
  objectiveTotal,
  updateInventoryNote: updateNote,
  updateObjectiveHud,
  collectNearbyPickups,
}) {
  const SWITCH_INTERACT_DISTANCE = TILE;

  function findNearestLightSwitch(player) {
    let best = null;
    let bestDistance = Infinity;
    getLightSwitches().forEach((sw) => {
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

  function handleInteract(player, context) {
    const { nearestNpc, guardCollision } = context;
    const gateState = getGateState();
    const gateDistance = Math.hypot(gateState.x - player.x, gateState.y - player.y);
    const nearGate = gateDistance <= 26;
    const { activeSwitch, switchDistance } = findNearestLightSwitch(player);

    if (context.interactRequested && activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      const toggled = activateLightSwitch(activeSwitch.id);
      if (toggled) {
        updateNote(`Vypínač ${activeSwitch.name} rozsvítil další část místnosti.`);
      } else {
        updateNote('Vypínač už je aktivovaný.');
      }
    } else if (context.interactRequested && nearestNpc?.nearby) {
      state.activeSpeaker = nearestNpc.name;
      if (nearestNpc.id === 'caretaker') {
        const hasApple = inventory.getItemCount('apple') > 0;
        if (!state.caretakerGaveApple) {
          const stored = inventory.addItem({ ...items.apple });

          if (stored) {
            state.caretakerGaveApple = true;
            state.activeLine = 'Tady máš jablko, doplní ti síly. Stiskni číslo slotu nebo na něj klikni v inventáři.';
            updateNote('Správce ti předal jablko. Použij číslo slotu (1-6) nebo klikni na slot pro doplnění jednoho života.');
            renderInventory(inventory);
          } else {
            state.activeLine = 'Inventář máš plný, uvolni si místo, ať ti můžu dát jablko.';
            updateNote('Nemáš místo na jablko. Uvolni slot a promluv si se Správcem znovu.');
          }
        } else if (hasApple) {
          state.activeLine = 'Jablko máš v inventáři. Klikni na slot nebo stiskni jeho číslo, až budeš potřebovat život.';
        } else {
          state.activeLine = nearestNpc.dialogue || 'Potřebuji náhradní články a nářadí. Najdeš je ve skladišti.';
        }
      } else if (nearestNpc.id === 'technician') {
        const readyForReward = state.objectivesCollected >= objectiveTotal;
        if (!readyForReward) {
          state.activeLine =
            'Musíš donést všechny díly. Jakmile je máš, vrátíš se pro klíč a já ti otevřu dveře.';
        } else if (!state.technicianGaveKey) {
          const stored = inventory.addItem({
            id: 'gate-key',
            name: 'Klíč od dveří',
            icon: '🔑',
            tint: '#f2d45c',
          });

          if (stored) {
            inventory.clearObjectiveItems();
            state.technicianGaveKey = true;
            unlockGateToNewMap();
            state.activeLine = 'Tady máš klíč. Dveře otevřeš směrem na východ do nové mapy.';
            state.areaName = 'Nové servisní křídlo';
            hud.updateAreaTitle(state.areaName, 1);
            updateNote('Klíč získán! Východní dveře se odemkly a mapa se rozšířila.');
            renderInventory(inventory);
          } else {
            state.activeLine = 'Tvůj inventář je plný, uvolni si místo na klíč.';
          }
        } else {
          state.activeLine = 'Dveře už jsou otevřené. Vejdi dál a pozor na nové prostory.';
        }
      } else {
        state.activeLine = nearestNpc.dialogue || 'Ráda tě vidím v základně.';
      }
      nearestNpc.hasSpoken = true;
      if (nearestNpc.info && !nearestNpc.infoShared) {
        updateNote(nearestNpc.info);
        nearestNpc.infoShared = true;
      }
      state.dialogueTime = 4;
      hud.showDialogue(state.activeSpeaker, state.activeLine);
    } else if (context.interactRequested && nearGate && !gateState.locked) {
      state.activeSpeaker = 'Systém Dveří';
      state.activeLine = 'Vstup potvrzen. Přecházíš do nového mapového křídla.';
      if (!state.gateKeyUsed) {
        const consumed = inventory.consumeItem('gate-key', 1);
        if (consumed) {
          state.gateKeyUsed = true;
          renderInventory(inventory);
          updateNote('Klíč se zasunul do zámku a zmizel z inventáře.');
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
      updateObjectiveHud(state.objectivesCollected);
      renderInventory(inventory);
      const names = collected.map((item) => item.name).join(', ');
      updateNote(`Sebráno: ${names}`);
      if (state.objectivesCollected >= objectiveTotal) {
        updateNote('Mise splněna: všechny komponenty jsou připravené. Vrať se za Technikem Járou.');
      }
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
      showDialogue(state.activeSpeaker, state.activeLine);
    } else if (nearestNpc?.nearby) {
      hud.showPrompt(`Stiskni E pro rozhovor s ${nearestNpc.name}`);
    } else if (activeSwitch && !activeSwitch.activated && switchDistance <= SWITCH_INTERACT_DISTANCE) {
      hud.showPrompt('Stiskni E pro aktivaci vypínače');
    } else if (nearGate) {
      if (context.gateState.locked) {
        hud.showPrompt('Dveře jsou zamčené. Technik Jára má klíč.');
      } else {
        hud.showPrompt('Dveře jsou otevřené, stiskni E pro vstup do nové mapy.');
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
