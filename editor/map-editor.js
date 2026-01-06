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

const MAX_SIZE = 30;
const DEFAULT_TOKEN = 'F1';
let grid = [];
let width = Number.parseInt(widthInput.value, 10) || 10;
let height = Number.parseInt(heightInput.value, 10) || 8;
let activeToken = tokenInput.value.trim() || DEFAULT_TOKEN;

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
        updateOutput();
      });
      cell.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const lastToken = grid[y][x];
        setActiveToken(lastToken);
      });
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
resizeGrid(width, height);
