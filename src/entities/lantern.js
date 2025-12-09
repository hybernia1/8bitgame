import { TILE } from '../core/constants.js';

const LIGHT_RADIUS_TILES = 2;
const PICKUP_DISTANCE = TILE * 0.8;

export function createLantern(player) {
  return {
    radius: TILE * LIGHT_RADIUS_TILES,
    carried: true,
    dropped: null,
    x: player.x,
    y: player.y,
  };
}

export function updateLanternAnchor(lantern, player) {
  if (!lantern.carried) return;
  lantern.x = player.x;
  lantern.y = player.y;
}

export function dropLantern(lantern, player) {
  if (!lantern.carried) return false;
  lantern.carried = false;
  lantern.dropped = { x: player.x, y: player.y };
  return true;
}

export function pickupLantern(lantern, player) {
  if (lantern.carried || !lantern.dropped) return false;
  const distance = Math.hypot(player.x - lantern.dropped.x, player.y - lantern.dropped.y);
  if (distance > PICKUP_DISTANCE + player.size / 2) return false;
  lantern.carried = true;
  lantern.dropped = null;
  lantern.x = player.x;
  lantern.y = player.y;
  return true;
}

export function isLanternNearby(lantern, player) {
  if (lantern.carried || !lantern.dropped) return false;
  const distance = Math.hypot(player.x - lantern.dropped.x, player.y - lantern.dropped.y);
  return distance <= PICKUP_DISTANCE + player.size / 2;
}

export function getLightSources(lantern, player) {
  const sources = [];
  if (lantern.carried) {
    sources.push({ x: player.x, y: player.y, radius: lantern.radius });
  }
  if (lantern.dropped) {
    sources.push({ x: lantern.dropped.x, y: lantern.dropped.y, radius: lantern.radius });
  }
  return sources;
}

export function drawDroppedLantern(ctx, camera, lantern) {
  if (!lantern.dropped) return;
  const px = lantern.dropped.x - camera.x;
  const py = lantern.dropped.y - camera.y;

  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = '#f2d45c';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0b0b10';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0b0b10';
  ctx.fillText('🔦', 0, 1);
  ctx.restore();
}
