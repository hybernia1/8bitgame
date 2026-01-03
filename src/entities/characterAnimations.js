const DIRECTIONS = ['down', 'left', 'right', 'up'];

function addAnimationsFromBase(animations, spriteSheet, baseName, { onlyMissing = false } = {}) {
  const hasAnimations = spriteSheet?.animations;
  if (!hasAnimations || !baseName) return;

  const clone = (animation) => animation?.clone?.();
  const capitalizedBase = baseName[0].toUpperCase() + baseName.slice(1);

  DIRECTIONS.forEach((direction) => {
    const capitalizedDir = direction[0].toUpperCase() + direction.slice(1);
    const walkKey = `${baseName}Walk${capitalizedDir}`;
    const idleKey = `${baseName}Idle${capitalizedDir}`;

    const walkAnimation = clone(hasAnimations?.[walkKey]);
    const idleAnimation = clone(hasAnimations?.[idleKey]);

    if (walkAnimation && (!onlyMissing || !animations[`walk-${direction}`])) {
      animations[`walk-${direction}`] = walkAnimation;
    }
    if (idleAnimation && (!onlyMissing || !animations[`idle-${direction}`])) {
      animations[`idle-${direction}`] = idleAnimation;
    }
  });

  const defaultWalk = clone(hasAnimations?.[`${baseName}Walk`]) || clone(hasAnimations?.[baseName]);
  const defaultIdle = clone(hasAnimations?.[`${baseName}Idle`]);

  if (defaultWalk && (!onlyMissing || !animations['walk-default'])) {
    animations['walk-default'] = defaultWalk;
  }
  if (defaultIdle && (!onlyMissing || !animations['idle-default'])) {
    animations['idle-default'] = defaultIdle;
  }
  if (defaultWalk && !animations['idle-default']) {
    animations['idle-default'] = defaultWalk;
  }
}

export function createAnimationMap(spriteSheet, baseName = 'player', options = {}) {
  const { includePlayerFallback = true } = options;
  const animations = {};

  addAnimationsFromBase(animations, spriteSheet, baseName);

  if (includePlayerFallback && baseName !== 'player') {
    addAnimationsFromBase(animations, spriteSheet, 'player', { onlyMissing: true });
  }

  return animations;
}

export function resolveDirection(dx, dy, fallback = 'down') {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (Math.abs(dy) > 0) return dy > 0 ? 'down' : 'up';
  return fallback;
}

export function pickAnimation(animations, state, direction) {
  return animations?.[`${state}-${direction}`] || animations?.[`${state}-default`] || null;
}
