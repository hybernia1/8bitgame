import { TEXTURE_TILE } from '../core/constants.js';

const AVATAR_PATHS = {
  player: 'assets/hero/hero.png',
  npc: 'assets/npc/npc.png',
  hana: 'assets/npc/hana.png',
  jara: 'assets/npc/jara.png',
  caretaker: 'assets/npc/caretaker.png',
  cat: 'assets/npc/cat.png',
  monster: 'assets/npc/monster.png',
};

const avatarLayoutCache = new Map();
let avatarRequestId = 0;

function resolveAvatarUrl(path) {
  if (!path) return '';
  try {
    return typeof document !== 'undefined' && document.baseURI ? new URL(path, document.baseURI).href : path;
  } catch {
    return path;
  }
}

function resolveTextureTileSize(texture) {
  if (!texture) return TEXTURE_TILE;
  const preferredSizes = [TEXTURE_TILE * 2, TEXTURE_TILE];
  const matchingSize = preferredSizes.find(
    (size) => texture.width % size === 0 && texture.height % size === 0,
  );
  if (matchingSize) return matchingSize;
  return Math.min(TEXTURE_TILE, texture.width, texture.height);
}

function resolveAvatarLayout(image) {
  const sourceTile = resolveTextureTileSize(image);
  const cols = Math.max(1, Math.floor(image.width / sourceTile));
  const rows = Math.max(1, Math.floor(image.height / sourceTile));
  return { cols, rows };
}

function applyAvatarFrame(node, layout, frameIndex = 1) {
  if (!node || !layout) return;
  const rect = node.getBoundingClientRect();
  const frameWidth = rect.width || node.clientWidth || node.offsetWidth;
  const frameHeight = rect.height || node.clientHeight || node.offsetHeight;
  if (!frameWidth || !frameHeight) return;

  const totalFrames = layout.cols * layout.rows;
  const safeIndex = Math.min(frameIndex, Math.max(0, totalFrames - 1));
  const col = safeIndex % layout.cols;
  const row = Math.floor(safeIndex / layout.cols);

  node.style.backgroundSize = `${frameWidth * layout.cols}px ${frameHeight * layout.rows}px`;
  node.style.backgroundPosition = `-${col * frameWidth}px -${row * frameHeight}px`;
}

async function loadAvatarLayout(path) {
  if (!path) return null;
  const resolvedPath = resolveAvatarUrl(path);
  if (avatarLayoutCache.has(resolvedPath)) {
    return avatarLayoutCache.get(resolvedPath);
  }
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(resolveAvatarLayout(image));
    image.onerror = () => resolve(null);
    image.src = resolvedPath;
  });
  avatarLayoutCache.set(resolvedPath, promise);
  return promise;
}

export function resolveAvatarPath(meta = {}) {
  if (!meta) return null;
  const { speakerType, spriteName } = meta;
  if (speakerType === 'player') return AVATAR_PATHS.player;
  if (spriteName && AVATAR_PATHS[spriteName]) return AVATAR_PATHS[spriteName];
  if (speakerType === 'npc') return AVATAR_PATHS.npc;
  return null;
}

export function resolveAvatarPathFromId(avatarId) {
  if (!avatarId) return null;
  if (AVATAR_PATHS[avatarId]) return AVATAR_PATHS[avatarId];
  return null;
}

export async function applyAvatarSprite(node, avatarPath, { frameIndex = 1 } = {}) {
  if (!node) return;
  if (!avatarPath) {
    node.style.backgroundImage = '';
    node.style.backgroundSize = '';
    node.style.backgroundPosition = '';
    return;
  }

  const resolvedPath = resolveAvatarUrl(avatarPath);
  const requestId = String((avatarRequestId += 1));
  node.dataset.avatarRequestId = requestId;
  node.style.backgroundImage = `url(${resolvedPath})`;

  const layout = await loadAvatarLayout(avatarPath);
  if (!layout) return;
  if (node.dataset.avatarRequestId !== requestId) return;

  applyAvatarFrame(node, layout, frameIndex);
}
