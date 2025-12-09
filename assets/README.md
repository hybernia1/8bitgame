# Asset drop-in points

This project will generate procedural sprites when no external textures are present. To override them, drop your own **32x32 PNG** textures into the folders below (leave files out if you want to keep the procedural look). For convenience on static hosts, the loader also checks for files placed directly under `assets/` (for example, `assets/hero.png` instead of `assets/hero/hero.png`). Preferred locations are:

- `assets/tiles/floor.png` – base floor tile for the demo map.
- `assets/walls/wall.png` – wall tile for level geometry.
- `assets/doors/door.png` – closed-door tile used on the gate.
- `assets/hero/hero.png` – main playable character.
- `assets/npc/npc.png` – friendly NPCs in the level.
- `assets/npc/monster.png` – optional hostile NPC variant.
- `assets/items/pickup.png` – collectibles/objectives in the level.
- `assets/props/prop.png` – decorative props (unused by default but supported by the sprite sheet).

If any of the files above are missing, the game falls back to the built-in procedural sprites.
