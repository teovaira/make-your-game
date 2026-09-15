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
  PLAYER_SPEED,
  ENEMY_SPEED,
} from './constants.js';

function isInSpawnSafeZone(row, col) {
  const { row: spawnRow, col: spawnCol } = PLAYER_SPAWN;
  return (
    (row === spawnRow && col === spawnCol) ||
    (row === spawnRow && col === spawnCol + 1) ||
    (row === spawnRow + 1 && col === spawnCol)
  );
}

// An enemy one step outside the safe zone can reach the player before they've moved at all.
// Only enemy spawns avoid these tiles — soft blocks may still land here, so terrain and the
// RNG call order stay identical to a board without this rule.
function isNextToSpawnSafeZone(row, col) {
  const { row: spawnRow, col: spawnCol } = PLAYER_SPAWN;
  return (row === spawnRow && col === spawnCol + 2) || (row === spawnRow + 2 && col === spawnCol);
}

// RNG contract: random() must return a number in [0, 1] — the clamp below tolerates
// exactly 1 (unlike Math.random(), which never reaches it), but a negative number or
// NaN is out of contract and not guarded against. Called once per eligible interior
// cell — border, pillar, and spawn-safe-zone cells are never eligible and never
// consume a call — in row-major order, while building the grid; then once more to
// pick which soft cell conceals the exit. The exit and enemy-space guarantees below
// don't call random() at all — they use deterministic shift()/pop(), so they don't
// change this call count.
function buildGrid(random) {
  const grid = [];
  const softCells = [];
  const emptyCells = [];
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
      } else if (!isSpawnSafeZone && !isNextToSpawnSafeZone(row, col)) {
        emptyCells.push({ row, col });
      }

      cols.push({ type });
    }
    grid.push(cols);
  }

  // Guarantee an exit can always be concealed, even if the RNG never favored soft-block
  // placement (e.g. every roll landed above SOFT_BLOCK_DENSITY) — an unwinnable board with
  // no error signal is worse than force-converting one tile. Picks deterministically so the
  // fallback doesn't consume a random() call and shift the documented call order.
  if (softCells.length === 0) {
    const forced = emptyCells.shift();
    grid[forced.row][forced.col].type = 'soft';
    softCells.push(forced);
  }

  const exitIndex = Math.min(Math.floor(random() * softCells.length), softCells.length - 1);
  const exit = softCells[exitIndex];

  // Guarantee enough walkable tiles exist for every enemy, even if the RNG saturated the
  // board with soft blocks — reclaims soft cells back to 'empty' (never the cell concealing
  // the exit, and never a tile enemies can't spawn on, since reclaiming one wouldn't add a
  // candidate), so the grid can end up with fewer 'soft' cells than the RNG roll alone
  // produced. Pops from the end of the row-major list so reclaimed tiles, which enemies may
  // then spawn on, sit far from the player's top-left spawn.
  const reclaimableSoftCells = softCells.filter(
    (cell) =>
      !(cell.row === exit.row && cell.col === exit.col) &&
      !isNextToSpawnSafeZone(cell.row, cell.col)
  );
  while (emptyCells.length < ENEMY_COUNT && reclaimableSoftCells.length > 0) {
    const reclaimed = reclaimableSoftCells.pop();
    grid[reclaimed.row][reclaimed.col].type = 'empty';
    emptyCells.push(reclaimed);
  }

  return { grid, exit, emptyCells };
}

// RNG contract (continued): after buildGrid's calls above, random() is called exactly
// ENEMY_COUNT times here, once per enemy placed (a return value of exactly 1 is safe,
// same as above).
function buildEnemies(emptyCells, random) {
  const enemies = [];
  for (let i = 0; i < ENEMY_COUNT; i += 1) {
    const index = Math.min(Math.floor(random() * emptyCells.length), emptyCells.length - 1);
    const { row, col } = emptyCells.splice(index, 1)[0];
    enemies.push({
      id: `enemy-${i}`,
      row,
      col,
      x: col * TILE_SIZE_PX,
      y: row * TILE_SIZE_PX,
      alive: true,
      aiType: ENEMY_AI_TYPES[i % ENEMY_AI_TYPES.length],
      speed: ENEMY_SPEED,
    });
  }
  return enemies;
}

export function initGameState({ random = Math.random } = {}) {
  const { grid, exit, emptyCells } = buildGrid(random);
  const enemies = buildEnemies(emptyCells, random);

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
      speed: PLAYER_SPEED,
    },
  };
}
