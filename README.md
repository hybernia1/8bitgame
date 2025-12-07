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
