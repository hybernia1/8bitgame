// Rendered tile size in the world (pixels on canvas)
export const TILE = 64;

// Source texture size (pixels in the sprite sheet). Keep this at 32 if your
// images stay 32x32 but you want to upscale them to the rendered TILE size.
export const TEXTURE_TILE = 32;

export const WORLD = {
  width: 32,
  height: 18,
};

export const COLORS = {
  wall: '#1f2430',
  wallInner: '#2c3342',
  floor: '#121219',
  floorGlow: 'rgba(92, 242, 204, 0.06)',
  doorClosed: '#2a1b1f',
  doorAccent: '#f2d45c',
  gridBackground: '#0b0b10',
  gridBorder: '#0b0c10',
};
