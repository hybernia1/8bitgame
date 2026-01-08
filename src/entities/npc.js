import { TILE, TILE_SCALE } from '../core/constants.js';
import { resolveWorldPosition } from '../core/positioning.js';
import { createAnimationMap, pickAnimation, resolveDirection } from './characterAnimations.js';

const TALK_RADIUS = 26 * TILE_SCALE;
const CHARACTER_SIZE = Math.round(TILE * 0.6875);
const MIN_TARGET_DISTANCE = 4 * TILE_SCALE;
const DEFAULT_WANDER_SPEED = 36 * TILE_SCALE;
const DEFAULT_PATROL_SPEED = 40 * TILE_SCALE;
const DEFAULT_LETHAL_WANDER_SPEED = 30 * TILE_SCALE;
const NPC_COLLISION_PADDING = 2 * TILE_SCALE;
const STEER_DISTANCE_STEPS = [1, 0.65, 0.35];
const STEER_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
];

function toWorldPosition(point = {}) {
  return resolveWorldPosition(point);
}

function normalizeVector(x = 0, y = 0) {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function updatePatrol(npc, dt, player, collision = {}) {
  const canMove = typeof collision?.canMove === 'function' ? collision.canMove : null;
  const size = npc.size ?? TILE;
  const collisionSize = Math.max(TILE_SCALE, size - NPC_COLLISION_PADDING);
  const wanderSpeed = npc.wanderSpeed ?? npc.speed ?? DEFAULT_WANDER_SPEED;
  const patrolSpeed = npc.speed ?? DEFAULT_PATROL_SPEED;

  const applyMovement = (dx, dy) => {
    if (!canMove) {
      npc.x += dx;
      npc.y += dy;
      return { dx, dy, moving: dx !== 0 || dy !== 0 };
    }

    const attemptAxisMove = (axis, delta) => {
      if (!delta) return 0;
      const nx = axis === 'x' ? npc.x + delta : npc.x;
      const ny = axis === 'y' ? npc.y + delta : npc.y;
      if (!canMove(collisionSize, nx, ny)) return 0;
      if (axis === 'x') {
        npc.x = nx;
      } else {
        npc.y = ny;
      }
      return delta;
    };

    const movedX = attemptAxisMove('x', dx);
    const movedY = attemptAxisMove('y', dy);
    return { dx: movedX, dy: movedY, moving: movedX !== 0 || movedY !== 0 };
  };

  const applySteeredMovement = (dx, dy) => {
    const movement = applyMovement(dx, dy);
    if (movement.moving || !canMove) {
      npc.stuckTimer = 0;
      return movement;
    }

    const moveDistance = Math.hypot(dx, dy);
    if (!moveDistance) return movement;

    const desired = normalizeVector(dx, dy);
    const lastDirection = normalizeVector(npc.lastDirection?.x ?? 0, npc.lastDirection?.y ?? 0);
    const hasLastDirection = lastDirection.x !== 0 || lastDirection.y !== 0;
    npc.stuckTimer = (npc.stuckTimer ?? 0) + dt;
    const stuckBias = Math.min(1, npc.stuckTimer / 0.6);

    const scoredDirections = STEER_DIRECTIONS.map((direction) => {
      const desiredScore = direction.x * desired.x + direction.y * desired.y;
      const lastScore = hasLastDirection
        ? direction.x * lastDirection.x + direction.y * lastDirection.y
        : 0;
      const perpendicularScore = 1 - Math.abs(desiredScore);
      return {
        direction,
        score: desiredScore + lastScore * 0.15 + perpendicularScore * 0.35 * stuckBias,
      };
    }).sort((a, b) => b.score - a.score);

    const primaryAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    const axisOrder = primaryAxis === 'x' ? ['x', 'y'] : ['y', 'x'];
    for (const axis of axisOrder) {
      const axisDelta = axis === 'x' ? dx : dy;
      if (!axisDelta) continue;
      const axisMovement = applyMovement(axis === 'x' ? axisDelta : 0, axis === 'y' ? axisDelta : 0);
      if (axisMovement.moving) {
        npc.stuckTimer = 0;
        return axisMovement;
      }
    }

    for (const { direction } of scoredDirections) {
      for (const step of STEER_DISTANCE_STEPS) {
        const fallbackMovement = applyMovement(
          direction.x * moveDistance * step,
          direction.y * moveDistance * step,
        );
        if (fallbackMovement.moving) {
          npc.stuckTimer = 0;
          return fallbackMovement;
        }
      }
    }

    return movement;
  };

  const updateFacingFromMovement = (movement, fallbackFacing) => {
    if (!movement?.moving) return;
    const normalized = normalizeVector(movement.dx, movement.dy);
    if (!normalized.x && !normalized.y) return;
    npc.lastDirection = normalized;
    npc.facing = resolveDirection(normalized.x, normalized.y, fallbackFacing);
  };

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
      const normalized = normalizeVector(dx, dy);
      const movement = applySteeredMovement(normalized.x * move, normalized.y * move);
      updateFacingFromMovement(movement, npc.facing);
      if (!movement.moving) {
        return { dx: 0, dy: 0, moving: false };
      }
      return movement;
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
      const normalized = normalizeVector(dx, dy);
      const movement = applySteeredMovement(normalized.x * move, normalized.y * move);
      updateFacingFromMovement(movement, npc.facing);
      if (!movement.moving) {
        npc.wanderTarget = null;
        npc.wanderCooldown = npc.wanderInterval;
        return { dx: 0, dy: 0, moving: false };
      }
      return movement;
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
  const normalized = normalizeVector(dx, dy);
  const movement = applySteeredMovement(normalized.x * move, normalized.y * move);
  updateFacingFromMovement(movement, npc.facing);
  if (!movement.moving) {
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
    return { dx: 0, dy: 0, moving: false };
  }
  return movement;
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
      stuckTimer: 0,
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

export function updateNpcStates(npcs, player, dt, collision = {}) {
  let nearestNpc = null;
  let nearestDistance = Infinity;
  let guardCollision = false;

  npcs.forEach((npc) => {
    if (npc.defeated) return;

    const movement = updatePatrol(npc, dt, player, collision);
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
