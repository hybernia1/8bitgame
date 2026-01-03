import { keyPressed } from '../kontra.mjs';
import { COLORS } from '../core/constants.js';
import { createAnimationMap, pickAnimation, resolveDirection } from './characterAnimations.js';

function getInputAxis() {
  let dx = 0;
  let dy = 0;
  if (keyPressed('up') || keyPressed('w')) dy -= 1;
  if (keyPressed('down') || keyPressed('s')) dy += 1;
  if (keyPressed('left') || keyPressed('a')) dx -= 1;
  if (keyPressed('right') || keyPressed('d')) dx += 1;
  return { dx, dy };
}

export function createPlayer(spriteSheet, placements = {}) {
  const { playerStart = { x: 0, y: 0 } } = placements;
  const animations = createAnimationMap(spriteSheet, 'player');
  const facing = 'down';
  const currentAnimation =
    pickAnimation(animations, 'idle', facing) || pickAnimation(animations, 'walk', facing);
  currentAnimation?.start?.();

  return {
    x: playerStart.x,
    y: playerStart.y,
    speed: 120,
    size: 22,
    color: '#5cf2cc',
    lastDirection: { x: 1, y: 0 },
    facing,
    animationState: currentAnimation ? 'idle' : null,
    currentAnimation,
    animations,
  };
}

export function updatePlayer(player, dt, collision) {
  const { dx, dy } = getInputAxis();
  const moving = dx !== 0 || dy !== 0;
  const len = Math.hypot(dx, dy) || 1;
  const direction = resolveDirection(dx, dy, player.facing);

  if (moving) {
    const step = player.speed * dt;
    const nx = player.x + (dx / len) * step;
    const ny = player.y + (dy / len) * step;

    player.lastDirection = { x: dx / len, y: dy / len };
    player.facing = direction;

    if (collision.canMove(player.size, nx, player.y)) player.x = nx;
    if (collision.canMove(player.size, player.x, ny)) player.y = ny;
  }

  const nextState = moving ? 'walk' : 'idle';
  const nextAnimation = pickAnimation(player.animations, nextState, player.facing);

  if (player.animationState !== nextState || player.currentAnimation !== nextAnimation) {
    player.currentAnimation?.stop?.();
    player.currentAnimation = nextAnimation;
    player.animationState = nextState;
    player.currentAnimation?.start?.();
  }

  player.currentAnimation?.update?.(dt);
}

export function drawPlayer(ctx, camera, player, spriteSheet) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const half = player.size / 2;

  const hasSprite = player.currentAnimation || spriteSheet?.animations?.player;

  if (!hasSprite) {
    ctx.fillStyle = COLORS.gridBorder;
    ctx.fillRect(px - half - 1, py - half - 1, player.size + 2, player.size + 2);
    ctx.fillStyle = player.color;
    ctx.fillRect(px - half, py - half, player.size, player.size);
    ctx.fillStyle = '#183e35';
    ctx.fillRect(px - half, py + half - 4, player.size, 4);
  }

  if (player.currentAnimation) {
    ctx.save();
    ctx.translate(px, py);
    player.currentAnimation.render({
      context: ctx,
      x: -half,
      y: -half,
      width: player.size,
      height: player.size,
    });
    ctx.restore();
  } else {
    const playerSprite = spriteSheet?.animations?.player;
    playerSprite?.render({
      context: ctx,
      x: px - half,
      y: py - half,
      width: player.size,
      height: player.size,
    });
  }
}
