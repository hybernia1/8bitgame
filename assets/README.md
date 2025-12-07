# Sprite sheet usage

You can override the generated debug sprites by adding your own sprite sheet image:

- Place a PNG at `assets/spritesheet.png` (relative to `index.html`).
- Use 32x32 tiles laid out in reading order (left-to-right, top-to-bottom).
- The first seven frames should represent, in order: floor, wall, player, pickup, npc, monster, prop.
- Extra frames are ignored; the sheet only needs a single frame for each.

If no file is provided, the game will fall back to the built-in generated sprites.
