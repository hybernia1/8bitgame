# 8bitgame

A minimal HTML5 canvas demo for a top-down 8-bit style game. Move the character
around the enclosed level to test camera follow, collision, and basic feel
before adding enemies or objectives. Input and the main loop are powered by
the Kontra.js micro-library to keep the demo predictable without extra setup.

## Structure
- `index.html` – shell that loads the canvas and instructions.
- `src/style.css` – retro-inspired framing and HUD styling.
- `src/main.js` – canvas rendering, tile map, movement, and collision logic.

## Running locally
Open `index.html` in a browser. For a quick local server, run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Sprites
The game ships with procedurally generated placeholder sprites that cover the floor, walls, player, pickups, NPCs, monsters, and props. External sprite sheets are not currently loaded; all textures come from the built-in generator to keep the demo lightweight.

## Importing levels from Tiled
Levels can be authored in [Tiled](https://www.mapeditor.org/) and converted straight into the game data:

1. Create your map in Tiled with `collision` and `decor` tile layers (the importer defaults are in `src/data/tiled-presets.js`).
2. Export the map as a `.tmj` file into `assets/maps/`.
3. Run `npm run import` (alias for `npm run import:maps`) to generate matching modules under `src/data/maps/` and update the index.
4. Register the exported level in `src/world/level-data.js` via `registerLevelConfig` (for eager imports) or `registerLevelModule` (for lazy loading).

To define tiles that change once a gate unlocks without duplicating whole layers, use `tileLayers.unlockMask` with `{ tx, ty, tile }` entries instead of maintaining separate unlocked maps.

### Hand-written layouts

Token-based layouts avoid hard-coded IDs. Examples:

- Floors: `F1`, `F2`, …
- Walls: `W1`, `W2`, …
- Doors: `DOOR`, `DOOR_OPEN`
- Destroy overlays: `D1`, `W1D1` (overlay + base in one token)

Use `buildTileLayersFromTokens` and `resolveTileToken` from `src/data/levels/map-utils.js` to convert these tokens into numeric layers. See `docs/map-authoring.md` for the full cheatsheet.
