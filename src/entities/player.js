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

function createAnimationMap(spriteSheet) {
  const animations = {};
  const hasAnimations = spriteSheet?.animations;

  if (hasAnimations?.playerIdle) animations.idle = hasAnimations.playerIdle.clone();
  if (hasAnimations?.playerIdleLeft) animations.idleLeft = hasAnimations.playerIdleLeft.clone();
  if (hasAnimations?.playerIdleRight) animations.idleRight = hasAnimations.playerIdleRight.clone();
  if (hasAnimations?.playerWalk) {
    animations.walk = hasAnimations.playerWalk.clone();
  } else if (hasAnimations?.player) {
    animations.walk = hasAnimations.player.clone();
  }
  if (hasAnimations?.playerWalkLeft) animations.walkLeft = hasAnimations.playerWalkLeft.clone();
  if (hasAnimations?.playerWalkRight) animations.walkRight = hasAnimations.playerWalkRight.clone();

  if (!animations.idle && animations.walk) {
    animations.idle = animations.walk;
  }

  return animations;
}

function selectIdleState(player) {
  if (player.lastDirection?.x < 0 && player.animations.idleLeft) return 'idleLeft';
  if (player.lastDirection?.x > 0 && player.animations.idleRight) return 'idleRight';
  if (player.animations.idle) return 'idle';
  if (player.animations.idleLeft) return 'idleLeft';
  if (player.animations.idleRight) return 'idleRight';
  return null;
}

function selectWalkState(player, dx) {
  if (dx < 0 && player.animations.walkLeft) return 'walkLeft';
  if (dx > 0 && player.animations.walkRight) return 'walkRight';
  if (player.animations.walk) return 'walk';
  if (player.animations.walkLeft) return 'walkLeft';
  if (player.animations.walkRight) return 'walkRight';
  return null;
}

export function createPlayer(spriteSheet) {
  const { playerStart } = getActorPlacements();
  const animations = createAnimationMap(spriteSheet);
  const initialState = selectIdleState({ animations }) || (animations.walk ? 'walk' : null);
  const currentAnimation = initialState ? animations[initialState] : null;
  currentAnimation?.start?.();

  return {
    x: playerStart.x,
    y: playerStart.y,
    speed: 120,
    size: 22,
    color: '#5cf2cc',
    lastDirection: { x: 1, y: 0 },
    animationState: currentAnimation ? initialState || 'idle' : null,
    currentAnimation,
    animations,
    usesDirectionalSprites: Boolean(
      animations.walkLeft || animations.walkRight || animations.idleLeft || animations.idleRight,
    ),
  };
}

export function updatePlayer(player, dt, collision) {
  const { dx, dy } = getInputAxis();
  const moving = dx !== 0 || dy !== 0;
  const len = Math.hypot(dx, dy) || 1;

  if (moving) {
    const step = player.speed * dt;
    const nx = player.x + (dx / len) * step;
    const ny = player.y + (dy / len) * step;

    player.lastDirection = { x: dx / len, y: dy / len };

    if (collision.canMove(player.size, nx, player.y)) player.x = nx;
    if (collision.canMove(player.size, player.x, ny)) player.y = ny;
  }

  const nextState = moving ? selectWalkState(player, dx) : selectIdleState(player);
  if (player.animationState !== nextState && player.animations?.[nextState]) {
    player.currentAnimation?.stop?.();
    player.currentAnimation = player.animations[nextState];
    player.animationState = nextState;
    player.currentAnimation?.start?.();
  }

  player.currentAnimation?.update?.(dt);
}

export function drawPlayer(ctx, camera, player, spriteSheet) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const half = player.size / 2;
  const facingLeft = player.lastDirection?.x < 0;
  const shouldMirror = facingLeft && !player.usesDirectionalSprites;

  ctx.fillStyle = COLORS.gridBorder;
  ctx.fillRect(px - half - 1, py - half - 1, player.size + 2, player.size + 2);
  ctx.fillStyle = player.color;
  ctx.fillRect(px - half, py - half, player.size, player.size);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(px - half, py + half - 4, player.size, 4);

  if (player.currentAnimation) {
    ctx.save();
    ctx.translate(px, py);
    if (shouldMirror) ctx.scale(-1, 1);
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
