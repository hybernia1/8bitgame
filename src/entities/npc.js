import { TILE, TILE_SCALE } from '../core/constants.js';
import { createAnimationMap, pickAnimation, resolveDirection } from './characterAnimations.js';

const TALK_RADIUS = 26 * TILE_SCALE;
const CHARACTER_SIZE = Math.round(TILE * 0.6875);
const MIN_TARGET_DISTANCE = 4 * TILE_SCALE;
const DEFAULT_WANDER_SPEED = 36 * TILE_SCALE;
const DEFAULT_PATROL_SPEED = 40 * TILE_SCALE;
const DEFAULT_LETHAL_WANDER_SPEED = 30 * TILE_SCALE;

function toWorldPosition(point = {}) {
  return {
    x: point.x ?? point.tx * TILE + TILE / 2,
    y: point.y ?? point.ty * TILE + TILE / 2,
  };
}

function updatePatrol(npc, dt, player) {
  const wanderSpeed = npc.wanderSpeed ?? npc.speed ?? DEFAULT_WANDER_SPEED;
  const patrolSpeed = npc.speed ?? DEFAULT_PATROL_SPEED;

  if (npc.busyTimer > 0) {
    npc.busyTimer = Math.max(0, npc.busyTimer - dt);
    return { dx: 0, dy: 0, moving: false };
  }

  if (npc.pursuesPlayer && player) {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const chaseSpeed = (npc.chaseSpeed ?? patrolSpeed) * dt;
      const move = Math.min(chaseSpeed, distance);
      const normalizedX = dx / (distance || 1);
      const normalizedY = dy / (distance || 1);
      const facing = resolveDirection(normalizedX, normalizedY, npc.facing);

      npc.lastDirection = { x: normalizedX, y: normalizedY };
      npc.facing = facing;
      npc.x += normalizedX * move;
      npc.y += normalizedY * move;

      return { dx: normalizedX, dy: normalizedY, moving: move > 0 };
    }
  }

  if (npc.wanderRadius > 0) {
    npc.wanderCooldown = Math.max(0, npc.wanderCooldown - dt);
    const anchor = npc.wanderAnchor ?? { x: npc.x, y: npc.y };
    if (!npc.wanderTarget && npc.wanderCooldown <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * npc.wanderRadius;
      npc.wanderTarget = {
        x: anchor.x + Math.cos(angle) * distance,
        y: anchor.y + Math.sin(angle) * distance,
      };
    }

    if (npc.wanderTarget) {
      const dx = npc.wanderTarget.x - npc.x;
      const dy = npc.wanderTarget.y - npc.y;
      const distance = Math.hypot(dx, dy);

      if (distance < MIN_TARGET_DISTANCE) {
        npc.wanderTarget = null;
        npc.wanderCooldown = npc.wanderInterval;
        return { dx: 0, dy: 0, moving: false };
      }

      const step = wanderSpeed * dt;
      const move = Math.min(step, distance);
      const normalizedX = dx / (distance || 1);
      const normalizedY = dy / (distance || 1);
      const facing = resolveDirection(normalizedX, normalizedY, npc.facing);

      npc.lastDirection = { x: normalizedX, y: normalizedY };
      npc.facing = facing;
      npc.x += normalizedX * move;
      npc.y += normalizedY * move;

      return { dx: normalizedX, dy: normalizedY, moving: move > 0 };
    }
  }

  if (!npc.patrolPoints?.length) return { dx: 0, dy: 0, moving: false };

  const target = npc.patrolPoints[npc.patrolIndex];
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  const distance = Math.hypot(dx, dy);

  if (distance < MIN_TARGET_DISTANCE) {
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
    return { dx: 0, dy: 0, moving: false };
  }

  const step = patrolSpeed * dt;
  const move = Math.min(step, distance);
  const normalizedX = dx / (distance || 1);
  const normalizedY = dy / (distance || 1);
  const facing = resolveDirection(normalizedX, normalizedY, npc.facing);

  npc.lastDirection = { x: normalizedX, y: normalizedY };
  npc.facing = facing;
  npc.x += normalizedX * move;
  npc.y += normalizedY * move;

  return { dx: normalizedX, dy: normalizedY, moving: move > 0 };
}

function updateNpcAnimation(npc, movement, dt) {
  const moving = movement?.moving ?? false;
  const direction = resolveDirection(movement?.dx ?? 0, movement?.dy ?? 0, npc.facing);

  if (moving) {
    npc.facing = direction;
  }

  const nextState = moving ? 'walk' : 'idle';
  const nextAnimation = pickAnimation(npc.animations, nextState, direction) || npc.animation;

  if (npc.animationState !== nextState || npc.currentAnimation !== nextAnimation) {
    npc.currentAnimation?.stop?.();
    npc.currentAnimation = nextAnimation;
    npc.animationState = nextState;
    npc.currentAnimation?.start?.();
  }

  npc.currentAnimation?.update?.(dt);
}

export function createNpcs(spriteSheet, placements) {
  const { npcs = [] } = placements || {};
  return npcs.map((npc) => {
    const spriteName = npc.sprite ?? (npc.lethal ? 'monster' : 'npc');
    const animationBase = npc.animationBase ?? spriteName;
    const animations = createAnimationMap(spriteSheet, animationBase, { includePlayerFallback: false });
    const health = npc.health ?? 1;
    const facing = 'down';
    const fallbackAnimation = spriteSheet?.animations?.[spriteName]?.clone?.();
    const currentAnimation =
      pickAnimation(animations, 'idle', facing) ||
      pickAnimation(animations, 'walk', facing) ||
      fallbackAnimation;
    currentAnimation?.start?.();

    const size = typeof npc.size === 'number' ? npc.size * TILE_SCALE : CHARACTER_SIZE;
    const speed = typeof npc.speed === 'number' ? npc.speed * TILE_SCALE : DEFAULT_PATROL_SPEED;
    const wanderSpeed =
      typeof npc.wanderSpeed === 'number'
        ? npc.wanderSpeed * TILE_SCALE
        : npc.speed != null
          ? speed
          : npc.lethal
            ? DEFAULT_LETHAL_WANDER_SPEED
            : DEFAULT_WANDER_SPEED;

    return {
      ...npc,
      sprite: spriteName,
      color: npc.color || '#87b0ff',
      tint: npc.tint || 'rgba(135, 176, 255, 0.18)',
      size,
      speed,
      wanderSpeed,
      ...toWorldPosition(npc),
      patrolPoints: npc.patrol?.map(toWorldPosition) ?? [],
      patrolIndex: 0,
      wanderRadius: npc.wanderRadius ?? 0,
      wanderInterval: npc.wanderInterval ?? 1.2,
      wanderAnchor: toWorldPosition(npc),
      wanderCooldown: 0,
      wanderTarget: null,
      busyTimer: 0,
      health,
      maxHealth: health,
      defeated: false,
      hasSpoken: false,
      infoShared: false,
      animation: fallbackAnimation,
      animations,
      facing,
      animationState: currentAnimation ? 'idle' : null,
      currentAnimation,
      lastDirection: { x: 0, y: 1 },
    };
  });
}

export function updateNpcStates(npcs, player, dt) {
  let nearestNpc = null;
  let nearestDistance = Infinity;
  let guardCollision = false;

  npcs.forEach((npc) => {
    if (npc.defeated) return;

    const movement = updatePatrol(npc, dt, player);
    updateNpcAnimation(npc, movement, dt);

    const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
    npc.nearby = distance <= TALK_RADIUS;

    const npcRadius = (npc.size ?? TILE) / 2;
    if (npc.lethal && distance <= player.size / 2 + npcRadius - 2) {
      guardCollision = true;
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNpc = npc;
    }
  });

  return { nearestNpc, guardCollision };
}

export function drawNpcs(ctx, camera, npcs) {
  npcs.forEach((npc) => {
    if (npc.defeated) return;

    const px = npc.x - camera.x;
    const py = npc.y - camera.y;
    const size = npc.size ?? TILE;
    const half = size / 2;
    const activeAnimation = npc.currentAnimation ?? npc.animation;

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = npc.tint;
    ctx.beginPath();
    ctx.arc(0, 2, half, 0, Math.PI * 2);
    ctx.fill();

    if (activeAnimation) {
      activeAnimation.render({ context: ctx, x: -half, y: -half, width: size, height: size });
    } else {
      ctx.fillStyle = npc.color;
      ctx.fillRect(-half, -half, size, size);
    }

    if (npc.name) {
      ctx.fillStyle = '#dbe8ff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(npc.name, 0, -half - 4);
    }

    if (npc.nearby) {
      ctx.strokeStyle = 'rgba(92, 242, 204, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, half, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (npc.lethal && npc.maxHealth > 1) {
      const barWidth = size;
      const healthRatio = Math.max(0, npc.health) / npc.maxHealth;
      ctx.translate(-half, -half - 10);
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(0, 0, barWidth, 6);
      ctx.fillStyle = '#5cf2cc';
      ctx.fillRect(0, 0, barWidth * healthRatio, 6);
      ctx.strokeStyle = '#0b0b10';
      ctx.strokeRect(0, 0, barWidth, 6);
    }

    ctx.restore();
  });
}

export function serializeNpcs(npcs = []) {
  return npcs.map((npc) => ({
    id: npc.id,
    x: npc.x,
    y: npc.y,
    facing: npc.facing,
    patrolIndex: npc.patrolIndex,
    health: npc.health,
    defeated: npc.defeated,
    hasSpoken: npc.hasSpoken,
    infoShared: npc.infoShared,
  }));
}

export function restoreNpcs(npcs = [], snapshot = []) {
  if (!Array.isArray(snapshot) || !snapshot.length) return;
  const npcsById = new Map(
    npcs.filter((npc) => npc?.id).map((npc) => [npc.id, npc]),
  );

  snapshot.forEach((entry, index) => {
    const target = (entry?.id && npcsById.get(entry.id)) || npcs[index];
    if (!target) return;

    if (typeof entry.x === 'number') target.x = entry.x;
    if (typeof entry.y === 'number') target.y = entry.y;
    if (entry.facing) target.facing = entry.facing;
    if (typeof entry.patrolIndex === 'number') target.patrolIndex = entry.patrolIndex;
    if (typeof entry.health === 'number') target.health = entry.health;
    target.defeated = Boolean(entry.defeated);
    target.hasSpoken = Boolean(entry.hasSpoken);
    target.infoShared = Boolean(entry.infoShared);

    if (target.defeated) {
      target.lethal = false;
    }
  });
}
