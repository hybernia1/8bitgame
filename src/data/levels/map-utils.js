import {
  TILE_IDS,
  getDestroyOverlayTileId,
  getFloorVariantTileId,
  getDecorVariantTileId,
  getWallVariantTileId,
} from '../../world/tile-registry.js';

const NAMED_TOKEN_MAP = new Map(
  Object.entries({
    DOOR: TILE_IDS.DOOR_CLOSED,
    DOOR_CLOSED: TILE_IDS.DOOR_CLOSED,
    DOOR_OPEN: TILE_IDS.DOOR_OPEN,
    OPEN_DOOR: TILE_IDS.DOOR_OPEN,
    CONSOLE: TILE_IDS.DECOR_CONSOLE,
    DECOR: TILE_IDS.DECOR_CONSOLE,
    FLOOR_BROKEN: TILE_IDS.FLOOR_BROKEN,
    BROKEN_FLOOR: TILE_IDS.FLOOR_BROKEN,
  }),
);

function parseVariantNumber(raw) {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeTokenEntry(token, defaultBase = TILE_IDS.FLOOR_PLAIN) {
  if (typeof token === 'number') {
    return { collision: token, decor: token, destroyedFloor: null };
  }

  const stringToken = String(token ?? '').trim();
  const numeric = Number.parseInt(stringToken, 10);
  if (Number.isFinite(numeric)) {
    return { collision: numeric, decor: numeric, destroyedFloor: null };
  }

  const named = NAMED_TOKEN_MAP.get(stringToken.toUpperCase());
  if (named != null) {
    return { collision: named, decor: named, destroyedFloor: null };
  }

  const compositeMatch = stringToken.match(/^(w|f)(\d+)?d(\d+)(?:f(\d+)?)?$/i);
  if (compositeMatch) {
    const baseToken = compositeMatch[1].toLowerCase();
    const baseVariant = parseVariantNumber(compositeMatch[2]);
    const destroyVariant = parseVariantNumber(compositeMatch[3]);
    const fallbackFloorVariant = compositeMatch[4] ? parseVariantNumber(compositeMatch[4]) : null;
    const collision =
      baseToken === 'w' ? getWallVariantTileId(baseVariant) : getFloorVariantTileId(baseVariant);
    const destroyedFloor =
      fallbackFloorVariant != null
        ? getFloorVariantTileId(fallbackFloorVariant)
        : baseToken === 'f'
          ? collision
          : defaultBase;
    return { collision, decor: getDestroyOverlayTileId(destroyVariant), destroyedFloor };
  }

  const decorMatch = stringToken.match(/^(w|f)(\d+)?e(\d+)$/i);
  if (decorMatch) {
    const baseToken = decorMatch[1].toLowerCase();
    const baseVariant = parseVariantNumber(decorMatch[2]);
    const decorVariant = parseVariantNumber(decorMatch[3]);
    const collision =
      baseToken === 'w' ? getWallVariantTileId(baseVariant) : getFloorVariantTileId(baseVariant);
    return { collision, decor: getDecorVariantTileId(decorVariant), destroyedFloor: null };
  }

  const baseMatch = stringToken.match(/^(w|f)(\d+)?$/i);
  if (baseMatch) {
    const baseToken = baseMatch[1].toLowerCase();
    const baseVariant = parseVariantNumber(baseMatch[2]);
    const collision =
      baseToken === 'w' ? getWallVariantTileId(baseVariant) : getFloorVariantTileId(baseVariant);
    return { collision, decor: collision, destroyedFloor: null };
  }

  const destroyOnlyMatch = stringToken.match(/^d(\d+)$/i);
  if (destroyOnlyMatch) {
    return {
      collision: defaultBase,
      decor: getDestroyOverlayTileId(parseVariantNumber(destroyOnlyMatch[1])),
      destroyedFloor: defaultBase,
    };
  }

  const decorOnlyMatch = stringToken.match(/^e(\d+)$/i);
  if (decorOnlyMatch) {
    return {
      collision: defaultBase,
      decor: getDecorVariantTileId(parseVariantNumber(decorOnlyMatch[1])),
      destroyedFloor: null,
    };
  }

  return { collision: defaultBase, decor: defaultBase, destroyedFloor: null };
}

/**
 * Resolve a single token into a numeric tile id.
 * @param {string|number} token
 * @param {number} [defaultBase]
 */
export function resolveTileToken(token, defaultBase = TILE_IDS.FLOOR_PLAIN) {
  const { collision } = normalizeTokenEntry(token, defaultBase);
  return collision;
}

/**
 * Convert an array of human friendly tokens (e.g., "W1", "F2", "W1D1") into tile layers.
 * @param {Array<string|number>} tokens
 * @param {{ defaultBase?: number }} [options]
 */
export function buildTileLayersFromTokens(tokens = [], { defaultBase = TILE_IDS.FLOOR_PLAIN } = {}) {
  const collision = [];
  const decor = [];
  const destroyedFloors = [];

  tokens.forEach((entry) => {
    const resolved = normalizeTokenEntry(entry, defaultBase);
    collision.push(resolved.collision);
    decor.push(resolved.decor);
    destroyedFloors.push(resolved.destroyedFloor);
  });

  return { collision, decor, destroyedFloors };
}
