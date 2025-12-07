const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 32;
const WORLD = {
  width: 20,
  height: 15,
};

const level = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

const player = {
  x: TILE * 2.5,
  y: TILE * 2.5,
  speed: 120,
  size: 18,
  color: '#5cf2cc',
};

const keys = new Set();
const camera = { x: 0, y: 0 };

function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD.width || ty >= WORLD.height) {
    return 1;
  }
  return level[ty * WORLD.width + tx];
}

function canMove(nx, ny) {
  const half = player.size / 2;
  const corners = [
    [nx - half, ny - half],
    [nx + half, ny - half],
    [nx - half, ny + half],
    [nx + half, ny + half],
  ];
  return corners.every(([x, y]) => tileAt(x, y) === 0);
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
  if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const step = player.speed * dt;
    const nx = player.x + dx * step;
    const ny = player.y + dy * step;
    if (canMove(nx, player.y)) player.x = nx;
    if (canMove(player.x, ny)) player.y = ny;
  }

  camera.x = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD.width * TILE - canvas.width));
  camera.y = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD.height * TILE - canvas.height));
}

function drawGrid() {
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawLevel() {
  for (let y = 0; y < WORLD.height; y++) {
    for (let x = 0; x < WORLD.width; x++) {
      const tile = level[y * WORLD.width + x];
      const screenX = x * TILE - camera.x;
      const screenY = y * TILE - camera.y;
      if (tile === 1) {
        ctx.fillStyle = '#1f2430';
        ctx.fillRect(screenX, screenY, TILE, TILE);
        ctx.fillStyle = '#2c3342';
        ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4);
      } else {
        ctx.fillStyle = '#121219';
        ctx.fillRect(screenX, screenY, TILE, TILE);
        ctx.fillStyle = 'rgba(92, 242, 204, 0.06)';
        ctx.fillRect(screenX, screenY + TILE - 6, TILE, 6);
      }
    }
  }
}

function drawPlayer() {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const half = player.size / 2;
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(px - half - 1, py - half - 1, player.size + 2, player.size + 2);
  ctx.fillStyle = player.color;
  ctx.fillRect(px - half, py - half, player.size, player.size);
  ctx.fillStyle = '#183e35';
  ctx.fillRect(px - half, py + half - 4, player.size, 4);
}

let last = 0;
function loop(timestamp) {
  const delta = (timestamp - last) / 1000;
  last = timestamp;
  update(delta);
  drawGrid();
  drawLevel();
  drawPlayer();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  keys.add(event.key);
  if (event.key === 'Escape') {
    document.querySelector('.panel').classList.toggle('hidden');
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key);
});

requestAnimationFrame(loop);
