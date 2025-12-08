/**
 * Resolve the render type for Phaser based on a custom environment hook.
 *
 * Some embedding environments provide an explicit render type (for example,
 * to force canvas rendering when WebGL is unavailable). When no override is
 * supplied, Phaser.AUTO is used.
 *
 * @param {typeof import('phaser')} Phaser
 * @returns {number}
 */
export function resolveRenderType(Phaser) {
  const customEnvRender = window.customEnv?.renderType ?? window.__PHASER_RENDER_TYPE__;

  if (typeof customEnvRender === 'number') {
    return customEnvRender;
  }

  return Phaser?.AUTO ?? 0;
}

