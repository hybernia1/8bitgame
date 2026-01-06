import {
  TILE_IDS,
  getDestroyOverlayTileId,
  getFloorVariantTileId,
  getWallVariantTileId,
} from '../../world/tile-registry.js';

const NAMED_TOKEN_MAP = new Map(
  Object.entries({
    DOOR: TILE_IDS.DOOR_CLOSED,
    DOOR_CLOSED: TILE_IDS.DOOR_CLOSED,
    DOOR_OPEN: TILE_IDS.DOOR_OPEN,
    OPEN_DOOR: TILE_IDS.DOOR_OPEN,
    WINDOW: TILE_IDS.WALL_WINDOW,
    WALL_WINDOW: TILE_IDS.WALL_WINDOW,
    WW: TILE_IDS.WALL_WINDOW,
    WALL_CRACKED: TILE_IDS.WALL_CRACKED,
    CRACKED_WALL: TILE_IDS.WALL_CRACKED,
    WC: TILE_IDS.WALL_CRACKED,
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
    return { collision: token, decor: token };
  }

  const stringToken = String(token ?? '').trim();
  const numeric = Number.parseInt(stringToken, 10);
  if (Number.isFinite(numeric)) {
    return { collision: numeric, decor: numeric };
  }

  const named = NAMED_TOKEN_MAP.get(stringToken.toUpperCase());
  if (named != null) {
    return { collision: named, decor: named };
  }

  const compositeMatch = stringToken.match(/^(w|f)(\d+)?d(\d+)$/i);
  if (compositeMatch) {
    const baseToken = compositeMatch[1].toLowerCase();
    const baseVariant = parseVariantNumber(compositeMatch[2]);
    const destroyVariant = parseVariantNumber(compositeMatch[3]);
    const collision =
      baseToken === 'w' ? getWallVariantTileId(baseVariant) : getFloorVariantTileId(baseVariant);
    return { collision, decor: getDestroyOverlayTileId(destroyVariant) };
  }

  const baseMatch = stringToken.match(/^(w|f)(\d+)?$/i);
  if (baseMatch) {
    const baseToken = baseMatch[1].toLowerCase();
    const baseVariant = parseVariantNumber(baseMatch[2]);
    const collision =
      baseToken === 'w' ? getWallVariantTileId(baseVariant) : getFloorVariantTileId(baseVariant);
    return { collision, decor: collision };
  }

  const destroyOnlyMatch = stringToken.match(/^d(\d+)$/i);
  if (destroyOnlyMatch) {
    return {
      collision: defaultBase,
      decor: getDestroyOverlayTileId(parseVariantNumber(destroyOnlyMatch[1])),
    };
  }

  return { collision: defaultBase, decor: defaultBase };
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

  tokens.forEach((entry) => {
    const resolved = normalizeTokenEntry(entry, defaultBase);
    collision.push(resolved.collision);
    decor.push(resolved.decor);
  });

  return { collision, decor };
}
