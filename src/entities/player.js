import { keyPressed } from '../kontra.mjs';
import { COLORS, TILE, TILE_SCALE } from '../core/constants.js';
import { attemptPush, findBlockingPushable, findNearbyPushable } from './pushables.js';
import { createAnimationMap, pickAnimation, resolveDirection } from './characterAnimations.js';

const PLAYER_SIZE = Math.round(TILE * 0.6875);
const PLAYER_SPEED = 120 * TILE_SCALE;
const GRAB_PADDING = 6 * TILE_SCALE;

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
    speed: PLAYER_SPEED,
    size: PLAYER_SIZE,
    color: '#5cf2cc',
    flashTimer: 0,
    flashVisible: true,
    lastDirection: { x: 1, y: 0 },
    facing,
    animationState: currentAnimation ? 'idle' : null,
    currentAnimation,
    animations,
    grabbedPushableId: null,
    interactPressedLastFrame: false,
  };
}

export function updatePlayer(player, dt, collision = {}) {
  const canMove = typeof collision?.canMove === 'function' ? collision.canMove : () => true;
  const pushables = collision?.pushables ?? [];
  const { dx, dy } = getInputAxis();
  const moving = dx !== 0 || dy !== 0;
  const actionPressed = keyPressed('e');
  const actionJustPressed = actionPressed && !player.interactPressedLastFrame;
  const len = Math.hypot(dx, dy) || 1;
  const direction = resolveDirection(dx, dy, player.facing);
  const grabPadding = GRAB_PADDING;

  const releaseGrab = () => {
    player.grabbedPushableId = null;
    return null;
  };

  const findGrabbed = () => pushables.find((prop) => prop.id === player.grabbedPushableId);

  let grabbed = findGrabbed();

  if (player.grabbedPushableId && !grabbed) {
    grabbed = releaseGrab();
  }

  const touchingGrabbed = grabbed
    ? findNearbyPushable([grabbed], player.size, player.x, player.y, grabPadding)
    : null;

  if (!touchingGrabbed) {
    grabbed = releaseGrab();
  }

  if (actionJustPressed) {
    if (grabbed) {
      grabbed = releaseGrab();
    } else {
      const candidate = findNearbyPushable(pushables, player.size, player.x, player.y, grabPadding);
      player.grabbedPushableId = candidate?.id ?? null;
      grabbed = candidate ?? null;
    }
  }

  if (moving) {
    const step = player.speed * dt;
    const moveX = (dx / len) * step;
    const moveY = (dy / len) * step;

    player.lastDirection = { x: dx / len, y: dy / len };
    player.facing = direction;

    const attemptAxisMove = (axis, delta) => {
      if (delta === 0) return;
      const nx = axis === 'x' ? player.x + delta : player.x;
      const ny = axis === 'y' ? player.y + delta : player.y;
      const blocking = findBlockingPushable(pushables, player.size, nx, ny);
      let grabbedMoved = false;

      if (blocking) {
        if (!grabbed || blocking !== grabbed) return;
        const pushed = attemptPush(pushables, blocking, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0, canMove);
        grabbedMoved = pushed && blocking === grabbed;
        if (!pushed) return;
      }

      if (grabbed && !grabbedMoved) {
        const moved = attemptPush(pushables, grabbed, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0, canMove);
        if (!moved) return;
      }

      if (!canMove(player.size, nx, ny)) return;
      const overlapAfterMove = findBlockingPushable(pushables, player.size, nx, ny);
      if (overlapAfterMove) return;

      if (axis === 'x') {
        player.x = nx;
      } else {
        player.y = ny;
      }
    };

    attemptAxisMove('x', moveX);
    attemptAxisMove('y', moveY);
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
  player.interactPressedLastFrame = actionPressed;
}

export function drawPlayer(ctx, camera, player, spriteSheet) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const half = player.size / 2;

  if (player.flashTimer > 0 && player.flashVisible === false) {
    return;
  }

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

export function serializePlayer(player) {
  return {
    x: player.x,
    y: player.y,
    facing: player.facing,
    lastDirection: player.lastDirection,
    speed: player.speed,
    size: player.size,
    color: player.color,
  };
}

export function restorePlayer(player, snapshot, fallbackPosition = { x: 0, y: 0 }) {
  const safeSnapshot = snapshot ?? {};
  player.x = safeSnapshot.x ?? fallbackPosition.x ?? player.x;
  player.y = safeSnapshot.y ?? fallbackPosition.y ?? player.y;
  player.facing = safeSnapshot.facing ?? player.facing;
  player.lastDirection = safeSnapshot.lastDirection ?? player.lastDirection;
  player.speed = safeSnapshot.speed ?? player.speed;
  player.size = safeSnapshot.size ?? player.size;
  player.color = safeSnapshot.color ?? player.color;
  player.flashTimer = 0;
  player.flashVisible = true;
}
