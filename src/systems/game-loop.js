import { GameLoop } from '../kontra.mjs';

export function createGameLoop({ update, render }) {
  return GameLoop({ update, render });
}
