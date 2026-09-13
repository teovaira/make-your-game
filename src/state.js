import {
  STAGE_TIME_LIMIT_MS,
  DEFAULT_LIVES,
  DEFAULT_MAX_BOMBS,
  DEFAULT_BLAST_RADIUS,
  TILE_SIZE_PX,
  GRID_ROWS,
  GRID_COLS,
  SOFT_BLOCK_DENSITY,
  ENEMY_COUNT,
  ENEMY_POINTS,
  PLAYER_SPAWN,
} from './constants.js';

function isInSpawnSafeZone(row, col) {
  const { row: spawnRow, col: spawnCol } = PLAYER_SPAWN;
  return (
    (row === spawnRow && col === spawnCol) ||
    (row === spawnRow && col === spawnCol + 1) ||
    (row === spawnRow + 1 && col === spawnCol)
  );
}

function buildGrid(random) {
  const grid = [];
  const softCells = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const cols = [];
    for (let col = 0; col < GRID_COLS; col += 1) {
      const isBorder = row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
      const isPillar = row % 2 === 0 && col % 2 === 0;
      const isSpawnSafeZone = isInSpawnSafeZone(row, col);

      let type = 'empty';
      if (isBorder || isPillar) {
        type = 'wall';
      } else if (!isSpawnSafeZone && random() < SOFT_BLOCK_DENSITY) {
        type = 'soft';
        softCells.push({ row, col });
      }

      cols.push({ type });
    }
    grid.push(cols);
  }

  const exit = softCells[Math.floor(random() * softCells.length)];

  return { grid, exit };
}

function buildEnemies(grid, random) {
  const candidates = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (grid[row][col].type === 'empty' && !isInSpawnSafeZone(row, col)) {
        candidates.push({ row, col });
      }
    }
  }

  const aiTypes = Object.keys(ENEMY_POINTS);
  const enemies = [];
  for (let i = 0; i < ENEMY_COUNT && candidates.length > 0; i += 1) {
    const index = Math.floor(random() * candidates.length);
    const { row, col } = candidates.splice(index, 1)[0];
    enemies.push({
      id: `enemy-${i}`,
      row,
      col,
      x: col * TILE_SIZE_PX,
      y: row * TILE_SIZE_PX,
      alive: true,
      aiType: aiTypes[i % aiTypes.length],
    });
  }
  return enemies;
}

export function initGameState({ random = Math.random } = {}) {
  const { grid, exit } = buildGrid(random);
  const enemies = buildEnemies(grid, random);

  return {
    status: 'idle',
    score: 0,
    elapsedMs: 0,
    timeRemainingMs: STAGE_TIME_LIMIT_MS,
    grid,
    exit,
    bombs: [],
    explosions: [],
    powerUps: [],
    enemies,
    player: {
      row: PLAYER_SPAWN.row,
      col: PLAYER_SPAWN.col,
      x: PLAYER_SPAWN.col * TILE_SIZE_PX,
      y: PLAYER_SPAWN.row * TILE_SIZE_PX,
      direction: 'down',
      alive: true,
      livesRemaining: DEFAULT_LIVES,
      maxBombs: DEFAULT_MAX_BOMBS,
      activeBombs: 0,
      blastRadius: DEFAULT_BLAST_RADIUS,
    },
  };
}
