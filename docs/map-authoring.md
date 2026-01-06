# Map authoring cheatsheet

This project lets you write maps by hand (JS modules) or import them from Tiled while still keeping tiles human‑readable. Use the tokens below to avoid manually wiring numeric IDs.

## Tile tokens

- **Floors:** `F1`, `F2`, … (default is `F1`).
- **Walls:** `W1`, `W2`, … (default is `W1`).
- **Doors:** `DOOR`/`DOOR_CLOSED`, `DOOR_OPEN`.
- **Special walls:** `WW` (`WALL_WINDOW`). Use the composite tokens below for destructible walls.
- **Decor:** `CONSOLE`/`DECOR`.
- **Broken floor:** `FLOOR_BROKEN`.
- **Destroy overlays:** `D1`, `D2`, … A transparent sprite that sits on top of whatever collision tile is present and carries the destructible texture.
- **Composite with destroy:** `W1D1`, `F2D1`, etc. Sets collision to the base tile and decor to the destroy overlay in one go; this replaces the old `WC` destructible wall token and lets the destroy texture partially cover the selected wall variant.

> The old `WC` destructible wall shortcut and `FL` lit floor tile have been removed. Use composite `WnDm`/`FnDm` or standalone destroy overlays instead.

Destroy overlays render on the decor layer while reusing the collision tile underneath, so you only need a single transparent `assets/tiles/destroy.png` sheet with optional frames for extra variants.

## Building layouts in code

Use `buildTileLayersFromTokens` to convert a token array into both collision and decor layers:

```js
import { buildTileLayersFromTokens } from '../map-utils.js';

const layoutTokens = [
  'W1', 'W1', 'W1',
  'W1D1', 'F1', 'W1D2',
  'W1', 'W1', 'W1',
];

const { collision, decor } = buildTileLayersFromTokens(layoutTokens);
```

If you need a single numeric tile ID (e.g., for unlock masks or gate replacements), call `resolveTileToken('DOOR_OPEN')`.

## Using Tiled

The Tiled importer still works; set tile properties like `variant = W2` or `material = F3` to map them to the new dynamic variants. Destroy overlays use `variant = D1`, `D2`, etc., so destructible walls can be built by combining a wall on the collision layer with a destroy overlay on the decor layer.
