# 8bitgame

A minimal HTML5 demo for a top-down 8-bit style game. The prototype now runs on
Phaser 3 with a local loader that prefers `vendor/phaser.min.js` and falls back
to a CDN if the bundled file cannot be read. Drop the folder on any static
server and move the character around the enclosed level to test camera follow,
collision, and basic feel before adding enemies or objectives.

## Structure
- `index.html` – shell that loads the canvas, HUD, and interaction overlay.
- `src/style.css` – retro-inspired framing and HUD styling.
- `src/main.js` – Phaser scene that handles rendering, tile map, movement, and
  collision logic.
- `src/core` – shared constants and helper functions for Phaser sprite
  generation and level composition.
- `src/entities` – small helpers for spawning Phaser sprites for the player,
  NPCs, and pickups.
- `src/ui` – DOM rendering for the inventory and interaction overlay.

## Running locally
Open `index.html` in a browser. For a quick local server, run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Customizing sprites
The game ships with generated placeholder sprites drawn at runtime by Phaser.
If you want to experiment with custom art, swap the drawing functions in
`src/core/sprites.js` to paint your own textures before the level is created.
