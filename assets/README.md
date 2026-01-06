# Asset drop-in points

This project will generate procedural sprites when no external textures are present. To override them, drop your own **32x32 PNG** textures into the folders below (leave files out if you want to keep the procedural look). Create the folder if it is missing (props/items are trimmed by default to keep the repo light). For convenience on static hosts, the loader also checks for files placed directly under `assets/` (for example, `assets/hero.png` instead of `assets/hero/hero.png`). Preferred locations are:

- `assets/tiles/floor.png` – base floor tile for the demo map.
- `assets/walls/wall.png` – wall tile for level geometry.
- `assets/doors/door.png` – closed-door tile used on the gate.
- `assets/doors/door.open.png` – open-door tile shown after gates unlock.
- `assets/hero/hero.png` – main playable character. Use a 3x4 sheet (down, left, right, up) with three frames per row; drop in your own image to override the procedural fallback.
- `assets/npc/npc.png` – friendly NPCs in the level.
- `assets/npc/monster.png` – optional hostile NPC variant.
- `assets/items/pickup.png` – collectibles/objectives in the level.
- `assets/props/prop.png` – decorative props (unused by default but supported by the sprite sheet).

If your host only lets you drop files next to `index.html`, you can also use the
single-file names (`hero.png`, `floor.png`, etc.) in the project root; the
loader will pick them up after checking the preferred asset folders.

If any of the files above are missing, the game falls back to the built-in procedural sprites. Files ending with either
`.png` or `.PNG` are accepted so exports from different tools still load on case-sensitive hosts.
