import {
  STAGE_TIME_LIMIT_MS,
  DEFAULT_LIVES,
  DEFAULT_MAX_BOMBS,
  DEFAULT_BLAST_RADIUS,
  TILE_SIZE_PX,
  GRID_ROWS,
  GRID_COLS,
  SOFT_BLOCK_DENSITY,
} from './constants.js';

function buildGrid(random) {
  const grid = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const cols = [];
    for (let col = 0; col < GRID_COLS; col += 1) {
      const isBorder = row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
      const isPillar = row % 2 === 0 && col % 2 === 0;

      let type = 'empty';
      if (isBorder || isPillar) {
        type = 'wall';
      } else if (random() < SOFT_BLOCK_DENSITY) {
        type = 'soft';
      }

      cols.push({ type });
    }
    grid.push(cols);
  }
  return grid;
}

export function initGameState({ random = Math.random } = {}) {
  return {
    status: 'idle',
    score: 0,
    elapsedMs: 0,
    timeRemainingMs: STAGE_TIME_LIMIT_MS,
    grid: buildGrid(random),
    bombs: [],
    explosions: [],
    powerUps: [],
    player: {
      row: 1,
      col: 1,
      x: 1 * TILE_SIZE_PX,
      y: 1 * TILE_SIZE_PX,
      direction: 'down',
      alive: true,
      livesRemaining: DEFAULT_LIVES,
      maxBombs: DEFAULT_MAX_BOMBS,
      activeBombs: 0,
      blastRadius: DEFAULT_BLAST_RADIUS,
    },
  };
}
