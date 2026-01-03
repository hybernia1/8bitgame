import { GameLoop } from '../kontra.mjs';

export function createGameLoop({ getScene }) {
  const loop = GameLoop({
    update(dt) {
      const scene = getScene?.();
      scene?.handlers?.onUpdate?.(dt);
    },
    render() {
      const scene = getScene?.();
      scene?.handlers?.onRender?.();
    },
  });

  return loop;
}
