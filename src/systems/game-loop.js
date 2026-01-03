import { GameLoop } from '../kontra.mjs';

export function createGameLoop({ update, render }) {
  let paused = false;

  const loop = GameLoop({
    update(dt) {
      if (!paused && update) {
        update(dt);
      }
    },
    render,
  });

  return Object.assign(loop, {
    pauseUpdates() {
      paused = true;
    },
    resumeUpdates() {
      paused = false;
    },
  });
}
