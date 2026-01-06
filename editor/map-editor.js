const gridEl = document.querySelector('[data-grid]');
const widthInput = document.querySelector('[data-width-input]');
const heightInput = document.querySelector('[data-height-input]');
const tokenInput = document.querySelector('[data-token-input]');
const quickTokenList = document.querySelector('[data-quick-token-list]');
const outputEl = document.querySelector('[data-output]');
const applySizeBtn = document.querySelector('[data-apply-size]');
const fillBtn = document.querySelector('[data-fill-grid]');
const resetBtn = document.querySelector('[data-reset-grid]');
const copyBtn = document.querySelector('[data-copy-output]');
const texturePreviewEl = document.querySelector('[data-texture-preview]');
const texturePreviewImage = document.querySelector('[data-texture-image]');
const texturePreviewStatus = document.querySelector('[data-texture-status]');

const MAX_SIZE = 30;
const DEFAULT_TOKEN = 'F1';
let grid = [];
let width = Number.parseInt(widthInput.value, 10) || 10;
let height = Number.parseInt(heightInput.value, 10) || 8;
let activeToken = tokenInput.value.trim() || DEFAULT_TOKEN;
const placeholderTextureCache = new Map();

function resolveAssetUrl(path) {
  const assetsBase = new URL('../assets/', window.location.href);
  return new URL(path, assetsBase).toString();
}

function createPlaceholderTexture(token) {
  if (placeholderTextureCache.has(token)) return placeholderTextureCache.get(token);

  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b1b22';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3be0a1';
  ctx.fillRect(8, 8, size - 16, size - 16);
  ctx.fillStyle = '#0f0f16';
  ctx.font = '700 18px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(token.slice(0, 8), size / 2, size / 2);

  const dataUrl = canvas.toDataURL('image/png');
  placeholderTextureCache.set(token, dataUrl);
  return dataUrl;
}

function resolveTextureForToken(token) {
  const normalized = String(token ?? '').trim();
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  const isDoorOpen = upper.includes('DOOR_OPEN') || upper.includes('OPEN_DOOR');
  const isDoor = upper.includes('DOOR');
  const isWindowWall = upper === 'WW' || upper.includes('WINDOW');

  if (isDoorOpen) {
    return { url: resolveAssetUrl('doors/door.open.png'), label: 'Otevřené dveře', isPlaceholder: false };
  }
  if (isDoor) {
    return { url: resolveAssetUrl('doors/door.png'), label: 'Zavřené dveře', isPlaceholder: false };
  }
  if (isWindowWall) {
    return {
      url: resolveAssetUrl('walls/wall.window.png'),
      label: 'Zeď s oknem',
      isPlaceholder: false,
    };
  }

  const destroyOverlayMatch = upper.match(/^D\d+/);
  if (destroyOverlayMatch) {
    return {
      url: resolveAssetUrl('walls/wall.png'),
      label: 'Destrukce (náhled sdílí texturu zdi)',
      isPlaceholder: false,
    };
  }

  const baseLetter = upper.charAt(0);
  if (baseLetter === 'W') {
    return { url: resolveAssetUrl('walls/wall.png'), label: 'Varianta zdi', isPlaceholder: false };
  }
  if (baseLetter === 'F') {
    return { url: resolveAssetUrl('tiles/floor.png'), label: 'Varianta podlahy', isPlaceholder: false };
  }

  return {
    url: createPlaceholderTexture(normalized),
    label: `Generovaný náhled pro ${normalized}`,
    isPlaceholder: true,
  };
}

function applyTextureToCell(cell, token) {
  const texture = resolveTextureForToken(token);
  if (texture?.url) {
    cell.style.backgroundImage = `url("${texture.url}")`;
    cell.classList.add('has-texture');
    cell.dataset.placeholderTexture = texture.isPlaceholder ? 'true' : 'false';
  } else {
    cell.style.backgroundImage = '';
    cell.classList.remove('has-texture');
    cell.dataset.placeholderTexture = 'false';
  }
}

function updateTexturePreview(token) {
  if (!texturePreviewEl || !texturePreviewImage || !texturePreviewStatus) return;
  const texture = resolveTextureForToken(token);

  if (!texture) {
    texturePreviewEl.dataset.state = 'empty';
    texturePreviewImage.removeAttribute('src');
    texturePreviewImage.alt = '';
    texturePreviewStatus.textContent = 'Pro tento token není dostupný náhled.';
    return;
  }

  const { url, label, isPlaceholder } = texture;
  texturePreviewEl.dataset.state = 'loading';
  texturePreviewStatus.textContent = 'Načítám texturu…';
  texturePreviewImage.dataset.expectedUrl = url;
  texturePreviewImage.alt = label || `Textura pro ${token}`;

  texturePreviewImage.onload = () => {
    if (texturePreviewImage.dataset.expectedUrl !== url) return;
    texturePreviewEl.dataset.state = isPlaceholder ? 'placeholder' : 'ready';
    texturePreviewStatus.textContent = isPlaceholder
      ? 'Nenašel jsem soubor, zobrazuji generovaný náhled.'
      : label || 'Textura načtena';
  };

  texturePreviewImage.onerror = () => {
    if (texturePreviewImage.dataset.expectedUrl !== url) return;
    texturePreviewEl.dataset.state = 'error';
    texturePreviewStatus.textContent = 'Textura se nepodařilo načíst (soubor chybí?).';
  };

  texturePreviewImage.src = url;
}

function clampSize(value) {
  const parsed = Number.parseInt(value, 10) || 1;
  return Math.max(1, Math.min(MAX_SIZE, parsed));
}

function createGridData(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => DEFAULT_TOKEN));
}

function resizeGrid(newW, newH) {
  const nextGrid = createGridData(newW, newH);
  for (let y = 0; y < Math.min(height, newH); y += 1) {
    for (let x = 0; x < Math.min(width, newW); x += 1) {
      nextGrid[y][x] = grid[y]?.[x] ?? DEFAULT_TOKEN;
    }
  }
  width = newW;
  height = newH;
  grid = nextGrid;
  renderGrid();
}

function setActiveToken(token) {
  activeToken = token.trim() || DEFAULT_TOKEN;
  tokenInput.value = activeToken;
  updateTexturePreview(activeToken);
}

function formatLayoutTokens() {
  const rows = grid.map((row) => row.map((token) => `'${token}'`).join(', '));
  const formattedRows = rows.map((row) => `  ${row},`).join('\n');
  return `const WIDTH = ${width};\nconst HEIGHT = ${height};\n\nconst layoutTokens = [\n${formattedRows}\n];\n\n// Použij: const { collision, decor } = buildTileLayersFromTokens(layoutTokens);`;
}

function updateOutput() {
  outputEl.textContent = formatLayoutTokens();
}

function renderGrid() {
  gridEl.style.gridTemplateColumns = `repeat(${width}, minmax(40px, 1fr))`;
  gridEl.innerHTML = '';

  grid.forEach((row, y) => {
    row.forEach((token, x) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = token;
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener('click', () => {
        grid[y][x] = activeToken;
        cell.textContent = activeToken;
        applyTextureToCell(cell, activeToken);
        updateOutput();
      });
      cell.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const lastToken = grid[y][x];
        setActiveToken(lastToken);
      });
      applyTextureToCell(cell, token);
      gridEl.appendChild(cell);
    });
  });

  updateOutput();
}

function fillGrid(token) {
  grid = grid.map((row) => row.map(() => token));
  renderGrid();
}

applySizeBtn.addEventListener('click', () => {
  const newW = clampSize(widthInput.value);
  const newH = clampSize(heightInput.value);
  widthInput.value = newW;
  heightInput.value = newH;
  resizeGrid(newW, newH);
});

tokenInput.addEventListener('input', (event) => {
  setActiveToken(event.target.value);
});

quickTokenList.addEventListener('click', (event) => {
  const token = event.target?.dataset?.token;
  if (token) {
    setActiveToken(token);
  }
});

fillBtn.addEventListener('click', () => {
  fillGrid(activeToken);
});

resetBtn.addEventListener('click', () => {
  resizeGrid(width, height);
  setActiveToken(DEFAULT_TOKEN);
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(outputEl.textContent);
    copyBtn.textContent = 'Zkopírováno';
    setTimeout(() => {
      copyBtn.textContent = 'Zkopírovat do schránky';
    }, 1500);
  } catch (error) {
    console.error('Copy failed', error);
    copyBtn.textContent = 'Schránka není dostupná';
    setTimeout(() => {
      copyBtn.textContent = 'Zkopírovat do schránky';
    }, 2000);
  }
});

// Initial render
setActiveToken(activeToken);
resizeGrid(width, height);
