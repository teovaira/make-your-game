import { describe, it, expect } from 'vitest';
import { initGameState } from '../src/state.js';
import {
  STAGE_TIME_LIMIT_MS,
  DEFAULT_LIVES,
  DEFAULT_MAX_BOMBS,
  DEFAULT_BLAST_RADIUS,
  TILE_SIZE_PX,
  GRID_ROWS,
  GRID_COLS,
  ENEMY_COUNT,
  ENEMY_AI_TYPES,
  SOFT_BLOCK_DENSITY,
} from '../src/constants.js';

describe('initGameState', () => {
  it('starts idle with zero score and a full stage timer', () => {
    const state = initGameState();

    expect(state.status).toBe('idle');
    expect(state.score).toBe(0);
    expect(state.elapsedMs).toBe(0);
    expect(state.timeRemainingMs).toBe(STAGE_TIME_LIMIT_MS);
  });

  it('starts with no bombs, explosions, or power-ups', () => {
    const state = initGameState();

    expect(state.bombs).toEqual([]);
    expect(state.explosions).toEqual([]);
    expect(state.powerUps).toEqual([]);
  });

  it('starts the player alive with default stats', () => {
    const state = initGameState();

    expect(state.player.alive).toBe(true);
    expect(state.player.livesRemaining).toBe(DEFAULT_LIVES);
    expect(state.player.maxBombs).toBe(DEFAULT_MAX_BOMBS);
    expect(state.player.activeBombs).toBe(0);
    expect(state.player.blastRadius).toBe(DEFAULT_BLAST_RADIUS);
  });

  it('starts the player facing down', () => {
    const state = initGameState();

    expect(state.player.direction).toBe('down');
  });

  it('places the player on the spawn tile with matching pixel coordinates', () => {
    const state = initGameState();

    expect(state.player.row).toBe(1);
    expect(state.player.col).toBe(1);
    expect(state.player.x).toBe(1 * TILE_SIZE_PX);
    expect(state.player.y).toBe(1 * TILE_SIZE_PX);
  });

  it('returns a grid with GRID_ROWS rows and GRID_COLS columns', () => {
    const state = initGameState();

    expect(state.grid).toHaveLength(GRID_ROWS);
    state.grid.forEach((row) => expect(row).toHaveLength(GRID_COLS));
  });

  it('surrounds the grid with hard-block walls on the border', () => {
    const state = initGameState();

    for (let col = 0; col < GRID_COLS; col += 1) {
      expect(state.grid[0][col].type).toBe('wall');
      expect(state.grid[GRID_ROWS - 1][col].type).toBe('wall');
    }
    for (let row = 0; row < GRID_ROWS; row += 1) {
      expect(state.grid[row][0].type).toBe('wall');
      expect(state.grid[row][GRID_COLS - 1].type).toBe('wall');
    }
  });

  it('places hard-block pillars on even interior row/column intersections', () => {
    const state = initGameState();

    for (let row = 2; row < GRID_ROWS - 1; row += 2) {
      for (let col = 2; col < GRID_COLS - 1; col += 2) {
        expect(state.grid[row][col].type).toBe('wall');
      }
    }
  });

  it('fills eligible interior tiles with soft blocks when the RNG always favors placement', () => {
    const state = initGameState({ random: () => 0 });

    let eligibleCount = 0;
    let softCount = 0;
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLS - 1; col += 1) {
        const isPillar = row % 2 === 0 && col % 2 === 0;
        const isSpawnSafeZone =
          (row === 1 && col === 1) || (row === 1 && col === 2) || (row === 2 && col === 1);
        if (!isPillar && !isSpawnSafeZone) {
          eligibleCount += 1;
          if (state.grid[row][col].type === 'soft') softCount += 1;
        }
      }
    }
    // Exactly ENEMY_COUNT of the eligible cells get reclaimed back to 'empty' to guarantee
    // enemy placement (see buildEnemies), even when every RNG roll favored soft-block
    // placement — deterministic under this fixture, not just "most of them."
    expect(softCount).toBe(eligibleCount - ENEMY_COUNT);
  });

  it('keeps the spawn safe zone and the player tile walkable even when the RNG always favors placement', () => {
    const state = initGameState({ random: () => 0 });

    const safeZone = [
      [1, 1],
      [1, 2],
      [2, 1],
    ];
    safeZone.forEach(([row, col]) => {
      expect(state.grid[row][col].type).toBe('empty');
    });
    expect(state.grid[state.player.row][state.player.col].type).toBe('empty');
  });

  it('conceals the exit under one of the placed soft blocks', () => {
    const state = initGameState({ random: () => 0 });

    expect(typeof state.exit.row).toBe('number');
    expect(typeof state.exit.col).toBe('number');
    expect(state.grid[state.exit.row][state.exit.col].type).toBe('soft');
  });

  it('still conceals an exit under a soft block when the RNG never favors soft-block placement', () => {
    const state = initGameState({ random: () => 1 });
    expect(state.exit).toBeDefined();
    expect(state.grid[state.exit.row][state.exit.col].type).toBe('soft');
  });

  it('places no soft blocks from the main roll when the RNG equals SOFT_BLOCK_DENSITY exactly', () => {
    // The placement check is strict `<`, so a roll exactly at the threshold counts as
    // not favoring placement, same as any higher value — only the exit fallback's forced
    // cell should end up soft.
    const state = initGameState({ random: () => SOFT_BLOCK_DENSITY });

    let softCount = 0;
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell.type === 'soft') softCount += 1;
      }
    }
    expect(softCount).toBe(1);
    expect(state.grid[state.exit.row][state.exit.col].type).toBe('soft');
  });

  it('does not crash when the RNG returns exactly 1 during enemy index selection', () => {
    const state = initGameState({ random: () => 1 });

    const safeZone = [
      [1, 1],
      [1, 2],
      [2, 1],
    ];
    expect(state.enemies).toHaveLength(ENEMY_COUNT);
    state.enemies.forEach((enemy) => {
      expect(state.grid[enemy.row][enemy.col].type).toBe('empty');
      expect(safeZone).not.toContainEqual([enemy.row, enemy.col]);
    });
  });

  it('places every enemy on a distinct tile', () => {
    // random: () => 1 recomputes the same clamped index every pick if the candidate pool
    // isn't actually shrinking — a regression that stopped removing chosen candidates
    // would stack every enemy on the same tile under this fixture.
    const state = initGameState({ random: () => 1 });

    const occupiedTiles = new Set(state.enemies.map((enemy) => `${enemy.row},${enemy.col}`));
    expect(occupiedTiles.size).toBe(ENEMY_COUNT);
  });

  it('derives each enemy pixel position from its grid tile', () => {
    const state = initGameState();

    state.enemies.forEach((enemy) => {
      expect(enemy.x).toBe(enemy.col * TILE_SIZE_PX);
      expect(enemy.y).toBe(enemy.row * TILE_SIZE_PX);
    });
  });

  it('gives every enemy a unique id', () => {
    const state = initGameState();

    const ids = new Set(state.enemies.map((enemy) => enemy.id));
    expect(ids.size).toBe(ENEMY_COUNT);
  });

  it('cycles enemies through every AI type', () => {
    const state = initGameState();

    state.enemies.forEach((enemy) => expect(ENEMY_AI_TYPES).toContain(enemy.aiType));
    const typesUsed = new Set(state.enemies.map((enemy) => enemy.aiType));
    expect(typesUsed.size).toBe(Math.min(ENEMY_COUNT, ENEMY_AI_TYPES.length));
  });

  it('never reclaims the exit tile when the enemy-space guarantee reclaims other soft cells', () => {
    // Every eligible cell rolls soft (random() = 0), then the very next call — the
    // exit pick — returns 1, landing on the *last* row-major soft cell. buildEnemies
    // scans in the same row-major order, so that's exactly where its reclaim pass
    // starts popping from — the sharpest case for proving the exit is excluded.
    let eligibleCount = 0;
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLS - 1; col += 1) {
        const isPillar = row % 2 === 0 && col % 2 === 0;
        const isSpawnSafeZone =
          (row === 1 && col === 1) || (row === 1 && col === 2) || (row === 2 && col === 1);
        if (!isPillar && !isSpawnSafeZone) eligibleCount += 1;
      }
    }

    let call = 0;
    const random = () => {
      call += 1;
      return call === eligibleCount + 1 ? 1 : 0;
    };
    const state = initGameState({ random });

    expect(state.grid[state.exit.row][state.exit.col].type).toBe('soft');
    const enemyOnExit = state.enemies.some(
      (enemy) => enemy.row === state.exit.row && enemy.col === state.exit.col
    );
    expect(enemyOnExit).toBe(false);
  });

  it('guarantees ENEMY_COUNT enemies even when soft blocks fill every non-safe-zone tile', () => {
    const state = initGameState({ random: () => 0 });
    expect(state.enemies).toHaveLength(ENEMY_COUNT);
  });

  it('places ENEMY_COUNT alive, walkable enemies outside the spawn safe zone', () => {
    // Alternates above/below SOFT_BLOCK_DENSITY so the board contains a genuine mix of
    // 'soft' and 'empty' cells — a constant fixture yields all-or-nothing terrain and can
    // never actually exercise the "not on a soft block" assertion below.
    let call = 0;
    const random = () => (call++ % 2 === 0 ? 0.1 : 0.9);
    const state = initGameState({ random });

    expect(state.enemies).toHaveLength(ENEMY_COUNT);

    const safeZone = [
      [1, 1],
      [1, 2],
      [2, 1],
    ];
    state.enemies.forEach((enemy) => {
      expect(enemy.alive).toBe(true);
      expect(state.grid[enemy.row][enemy.col].type).toBe('empty');
      expect(safeZone).not.toContainEqual([enemy.row, enemy.col]);
    });
  });

  it('returns an independent GameState on every call', () => {
    // Restart calls initGameState() again and expects a clean board — if any array or
    // object were shared across calls (e.g. hoisted to module scope), mutating one
    // game's state would corrupt the next.
    const first = initGameState();
    const second = initGameState();

    expect(first.grid).not.toBe(second.grid);
    expect(first.bombs).not.toBe(second.bombs);
    expect(first.explosions).not.toBe(second.explosions);
    expect(first.powerUps).not.toBe(second.powerUps);
    expect(first.enemies).not.toBe(second.enemies);
    expect(first.player).not.toBe(second.player);

    first.bombs.push({ id: 'test-bomb' });
    expect(second.bombs).toEqual([]);
  });

  it('keeps enough eligible interior tiles for the exit plus every enemy', () => {
    // Guards a dormant crash: buildEnemies' candidate pool has no defensive check, so if
    // a future constants change ever left fewer eligible tiles than ENEMY_COUNT + 1 (one
    // for the exit, one each for the enemies), it would throw with no warning at the
    // constants-change site rather than here.
    let eligibleCount = 0;
    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLS - 1; col += 1) {
        const isPillar = row % 2 === 0 && col % 2 === 0;
        const isSpawnSafeZone =
          (row === 1 && col === 1) || (row === 1 && col === 2) || (row === 2 && col === 1);
        if (!isPillar && !isSpawnSafeZone) eligibleCount += 1;
      }
    }
    expect(eligibleCount).toBeGreaterThanOrEqual(ENEMY_COUNT + 1);
  });
});
