export const WIDESCREEN_DIMENSIONS = {
  width: 32,
  height: 18,
};

/**
 * Pads a flat tile layer to the target widescreen dimensions while keeping the
 * original tiles in the top-left corner. Extra tiles default to walls so
 * gameplay stays bounded.
 *
 * @param {number[]} layer A flattened tile array of length baseWidth * baseHeight.
 * @param {number} baseWidth The original layer width.
 * @param {object} [options]
 * @param {number} [options.targetWidth=WIDESCREEN_DIMENSIONS.width]
 * @param {number} [options.targetHeight=WIDESCREEN_DIMENSIONS.height]
 * @param {number} [options.fillValue=1]
 */
export function padLayer(layer, baseWidth, options = {}) {
  const { targetWidth = WIDESCREEN_DIMENSIONS.width, targetHeight = WIDESCREEN_DIMENSIONS.height, fillValue = 1 } =
    options;

  const baseHeight = Math.ceil(layer.length / baseWidth);
  const padded = new Array(targetWidth * targetHeight).fill(fillValue);

  for (let y = 0; y < Math.min(baseHeight, targetHeight); y += 1) {
    for (let x = 0; x < Math.min(baseWidth, targetWidth); x += 1) {
      const sourceIndex = y * baseWidth + x;
      const targetIndex = y * targetWidth + x;
      const value = layer[sourceIndex];
      if (value == null) continue;
      padded[targetIndex] = value;
    }
  }

  return padded;
}

/**
 * Adds configurable letterboxing around a tile layer, centering (or offsetting)
 * the original content inside a larger canvas. This is useful for presenting
 * smaller maps inside a fixed viewport without mutating the source layout.
 *
 * @param {number[]} layer A flattened tile array of length baseWidth * baseHeight.
 * @param {number} baseWidth The original layer width.
 * @param {number} baseHeight The original layer height.
 * @param {object} [options]
 * @param {number} [options.targetWidth=WIDESCREEN_DIMENSIONS.width]
 * @param {number} [options.targetHeight=WIDESCREEN_DIMENSIONS.height]
 * @param {number} [options.fillValue=1]
 * @param {'center'|'top-left'} [options.align='center'] How to place the source map.
 * @returns {{ layer: number[], offsetX: number, offsetY: number, width: number, height: number }}
 */
export function letterboxLayer(layer, baseWidth, baseHeight, options = {}) {
  const {
    targetWidth = WIDESCREEN_DIMENSIONS.width,
    targetHeight = WIDESCREEN_DIMENSIONS.height,
    fillValue = 1,
    align = 'center',
  } = options;

  const offsetX = align === 'center' ? Math.max(0, Math.floor((targetWidth - baseWidth) / 2)) : 0;
  const offsetY = align === 'center' ? Math.max(0, Math.floor((targetHeight - baseHeight) / 2)) : 0;

  const padded = new Array(targetWidth * targetHeight).fill(fillValue);

  for (let y = 0; y < Math.min(baseHeight, targetHeight); y += 1) {
    for (let x = 0; x < Math.min(baseWidth, targetWidth); x += 1) {
      const sourceIndex = y * baseWidth + x;
      const targetIndex = (y + offsetY) * targetWidth + (x + offsetX);
      const value = layer[sourceIndex];
      if (value == null) continue;
      padded[targetIndex] = value;
    }
  }

  return { layer: padded, offsetX, offsetY, width: targetWidth, height: targetHeight };
}
