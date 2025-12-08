import { TILE } from '../core/constants.js';

export function createPlayer(scene, startPosition, walls) {
  const sprite = scene.physics.add.sprite(startPosition.x, startPosition.y, 'player');
  sprite.setDepth(2);
  sprite.setCollideWorldBounds(true);
  sprite.body.setSize(22, 22);
  sprite.body.setOffset((TILE - 22) / 2, (TILE - 22) / 2);
  if (walls) {
    scene.physics.add.collider(sprite, walls);
  }
  return sprite;
}

export function createInput(scene) {
  const cursors = scene.input.keyboard.createCursorKeys();
  const keys = scene.input.keyboard.addKeys('W,A,S,D,E');
  return { cursors, keys };
}

export function updatePlayerMovement(player, input) {
  const left = input.cursors.left.isDown || input.keys.A.isDown;
  const right = input.cursors.right.isDown || input.keys.D.isDown;
  const up = input.cursors.up.isDown || input.keys.W.isDown;
  const down = input.cursors.down.isDown || input.keys.S.isDown;

  const velocity = new Phaser.Math.Vector2(
    (left ? -1 : 0) + (right ? 1 : 0),
    (up ? -1 : 0) + (down ? 1 : 0),
  );

  if (velocity.lengthSq() > 0) {
    velocity.normalize().scale(140);
  }

  player.setVelocity(velocity.x, velocity.y);
}
