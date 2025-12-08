import { keyPressed } from '../kontra.mjs';
import { COLORS } from '../core/constants.js';
import { getActorPlacements } from '../world/level.js';

function getInputAxis() {
  let dx = 0;
  let dy = 0;
  if (keyPressed('up') || keyPressed('w')) dy -= 1;
  if (keyPressed('down') || keyPressed('s')) dy += 1;
  if (keyPressed('left') || keyPressed('a')) dx -= 1;
  if (keyPressed('right') || keyPressed('d')) dx += 1;
  return { dx, dy };
}

export function createPlayer() {
  const { playerStart } = getActorPlacements();
  return {
    x: playerStart.x,
    y: playerStart.y,
    speed: 120,
    size: 22,
    color: '#5cf2cc',
  };
}

export function updatePlayer(player, dt, collision) {
  const { dx, dy } = getInputAxis();

  if (dx === 0 && dy === 0) return;

  const len = Math.hypot(dx, dy) || 1;
  const step = player.speed * dt;
  const nx = player.x + (dx / len) * step;
  const ny = player.y + (dy / len) * step;

  if (collision.canMove(player.size, nx, player.y)) player.x = nx;
  if (collision.canMove(player.size, player.x, ny)) player.y = ny;
}

export function drawPlayer(ctx, camera, player, spriteSheet) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const half = player.size / 2;
  const playerSprite = spriteSheet?.animations?.player;

  ctx.fillStyle = COLORS.gridBorder;
  ctx.fillRect(px - half - 1, py - half - 1, player.size + 2, player.size + 2);
  ctx.fillStyle = player.color;
  ctx.fillRect(px - half, py - half, player.size, player.size);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(px - half, py + half - 4, player.size, 4);

  if (playerSprite) {
    playerSprite.render({ context: ctx, x: px - half, y: py - half, width: player.size, height: player.size });
  }
}
