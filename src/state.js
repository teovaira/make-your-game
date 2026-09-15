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
  ENEMY_AI_TYPES,
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

// RNG contract: random() is called once per eligible interior cell — border, pillar, and
// spawn-safe-zone cells are never eligible and never consume a call — in row-major order,
// while building the grid; then once more to pick which soft cell conceals the exit. A
// return value of exactly 1 is safe (the index pick is clamped); it does not need to stay
// strictly below 1 the way Math.random()'s contract does. The exit-guarantee fallback below
// (when the RNG never favors soft-block placement) does its own grid scan and consumes no
// extra random() calls.
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

  // Guarantee an exit can always be concealed, even if the RNG never favored soft-block
  // placement (e.g. every roll landed above SOFT_BLOCK_DENSITY) — an unwinnable board with
  // no error signal is worse than force-converting one tile.
  if (softCells.length === 0) {
    for (let row = 0; row < GRID_ROWS && softCells.length === 0; row += 1) {
      for (let col = 0; col < GRID_COLS && softCells.length === 0; col += 1) {
        if (grid[row][col].type === 'empty' && !isInSpawnSafeZone(row, col)) {
          grid[row][col].type = 'soft';
          softCells.push({ row, col });
        }
      }
    }
  }

  const exitIndex = Math.min(Math.floor(random() * softCells.length), softCells.length - 1);
  const exit = softCells[exitIndex];

  return { grid, exit };
}

// RNG contract (continued): after buildGrid's calls above, random() is called exactly
// ENEMY_COUNT times here, once per enemy placed (a return value of exactly 1 is safe,
// same as above). The enemy-count-guarantee reclaim below is a deterministic pop(), not
// random(), so it doesn't change this call count.
function buildEnemies(grid, random, exit) {
  const candidates = [];
  const softCells = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const cell = grid[row][col];
      if (cell.type === 'empty' && !isInSpawnSafeZone(row, col)) {
        candidates.push({ row, col });
      } else if (cell.type === 'soft' && !(row === exit.row && col === exit.col)) {
        softCells.push({ row, col });
      }
    }
  }

  // Guarantee enough walkable tiles exist for every enemy, even if the RNG saturated the
  // board with soft blocks — reclaims soft cells back to 'empty' (never the cell concealing
  // the exit), so state.grid can end up with fewer 'soft' cells than the RNG roll alone
  // produced.
  while (candidates.length < ENEMY_COUNT && softCells.length > 0) {
    const reclaimed = softCells.pop();
    grid[reclaimed.row][reclaimed.col].type = 'empty';
    candidates.push(reclaimed);
  }

  const aiTypes = ENEMY_AI_TYPES;
  const enemies = [];
  for (let i = 0; i < ENEMY_COUNT; i += 1) {
    const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
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
  const enemies = buildEnemies(grid, random, exit);

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
