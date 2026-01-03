const scenes = new Map();

let currentScene = null;
let pausedScene = null;

function getEntry(name) {
  const scene = scenes.get(name);
  if (!scene) {
    throw new Error(`Scene "${name}" is not registered.`);
  }
  return { name, handlers: scene };
}

export function registerScene(name, handlers) {
  scenes.set(name, handlers);
}

async function exitCurrent(nextName, params) {
  if (!currentScene?.handlers?.onExit) return;
  await currentScene.handlers.onExit({ to: nextName, params });
}

export async function setScene(name, params) {
  if (name === currentScene?.name) return;

  if (name === 'pause' && currentScene?.name !== 'pause') {
    pausedScene = currentScene;
    await currentScene?.handlers?.onPause?.({ to: 'pause', params });
    const pauseEntry = getEntry(name);
    currentScene = pauseEntry;
    await pauseEntry.handlers.onEnter?.({ from: pausedScene?.name ?? null, params });
    return;
  }

  if (currentScene?.name === 'pause') {
    await currentScene.handlers.onExit?.({ to: name, params });
    const resumeTarget = pausedScene;
    pausedScene = null;

    if (resumeTarget && resumeTarget.name === name) {
      currentScene = resumeTarget;
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
