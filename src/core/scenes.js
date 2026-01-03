const scenes = new Map();

let currentScene = null;
let pausedScene = null;

function traceSceneEvent(event, detail = {}) {
  if (typeof console?.info === 'function') {
    console.info(`[scene] ${event}`, detail);
  }
}

function getEntry(name) {
  const scene = scenes.get(name);
  if (!scene) {
    throw new Error(`Scene "${name}" is not registered.`);
  }
  return { name, handlers: scene };
}

export function registerScene(name, handlers) {
  scenes.set(name, handlers ?? {});
}

export function getCurrentScene() {
  return currentScene;
}

async function exitCurrent(nextName, params) {
  if (!currentScene?.handlers?.onExit) return;
  traceSceneEvent('exit', { from: currentScene.name, to: nextName });
  await currentScene.handlers.onExit({ to: nextName, params });
}

export async function setScene(name, params) {
  if (name === currentScene?.name) return;

  if (name === 'pause' && currentScene?.name !== 'pause') {
    pausedScene = currentScene;
    traceSceneEvent('pause', { from: pausedScene?.name, to: 'pause' });
    await currentScene?.handlers?.onPause?.({ to: 'pause', params });
    const pauseEntry = getEntry(name);
    currentScene = pauseEntry;
    traceSceneEvent('enter', { name });
    await pauseEntry.handlers.onEnter?.({ from: pausedScene?.name ?? null, params });
    return;
  }

  if (currentScene?.name === 'pause') {
    traceSceneEvent('resume', { from: 'pause', to: name });
    await currentScene.handlers.onExit?.({ to: name, params });
    const resumeTarget = pausedScene;
    pausedScene = null;

    if (resumeTarget && resumeTarget.name === name) {
      currentScene = resumeTarget;
      traceSceneEvent('enter', { name });
      await currentScene.handlers.onResume?.({ from: 'pause', params });
      return;
    }

    await resumeTarget?.handlers?.onExit?.({ to: name, params });
  } else {
    await exitCurrent(name, params);
  }

  const nextEntry = getEntry(name);
  const from = currentScene?.name ?? null;
  currentScene = nextEntry;
  traceSceneEvent('enter', { name });
  await nextEntry.handlers.onEnter?.({ from, params });
}

export function resume(params) {
  if (currentScene?.name === 'pause' && pausedScene) {
    return setScene(pausedScene.name, params);
  }
  if (currentScene?.handlers?.onResume) {
    return currentScene.handlers.onResume({ from: null, params });
  }
  return Promise.resolve();
}

export function showMenu(params) {
  pausedScene = null;
  return setScene('menu', params);
}
