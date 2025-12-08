import { COLORS, TILE, WORLD } from '../core/constants.js';
import { demoLevel } from '../data/demoLevel.js';

export const levelGrid = [];
for (let row = 0; row < WORLD.height; row += 1) {
  const start = row * WORLD.width;
  levelGrid.push(demoLevel.map.slice(start, start + WORLD.width));
}

export function createLevel(scene) {
  const walls = scene.physics.add.staticGroup();
  const rt = scene.add.renderTexture(0, 0, WORLD.width * TILE, WORLD.height * TILE);
  rt.setOrigin(0, 0);

  levelGrid.forEach((row, y) => {
    row.forEach((tile, x) => {
      const drawKey = tile === 1 ? 'wall' : 'floor';
      rt.draw(drawKey, x * TILE, y * TILE);
      if (tile === 1) {
        const wall = walls.create(x * TILE + TILE / 2, y * TILE + TILE / 2, 'wall');
        wall.setSize(TILE, TILE);
        wall.refreshBody();
      }
    });
  });

  return { walls, renderTexture: rt };
}

export function getLevelName() {
  return demoLevel.name;
}

export function getActorPlacements() {
  return demoLevel.actors;
}

export function getPickupTemplates() {
  return demoLevel.pickups;
}

export function isWallTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) {
    return true;
  }
  return levelGrid[ty]?.[tx] === 1;
}

export function drawDebugBounds(scene) {
  const graphics = scene.add.graphics();
  graphics.lineStyle(1, Phaser.Display.Color.HexStringToColor(COLORS.gridBorder).color, 0.6);
  graphics.strokeRect(0, 0, WORLD.width * TILE, WORLD.height * TILE);
  return graphics;
}
