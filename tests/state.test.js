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
} from '../src/constants.js';

describe('initGameState', () => {
  it('returns a fresh idle GameState with default player stats', () => {
    const state = initGameState();

    expect(state.status).toBe('idle');
    expect(state.score).toBe(0);
    expect(state.elapsedMs).toBe(0);
    expect(state.timeRemainingMs).toBe(STAGE_TIME_LIMIT_MS);

    expect(state.bombs).toEqual([]);
    expect(state.explosions).toEqual([]);
    expect(state.powerUps).toEqual([]);

    expect(state.player.alive).toBe(true);
    expect(state.player.livesRemaining).toBe(DEFAULT_LIVES);
    expect(state.player.maxBombs).toBe(DEFAULT_MAX_BOMBS);
    expect(state.player.activeBombs).toBe(0);
    expect(state.player.blastRadius).toBe(DEFAULT_BLAST_RADIUS);

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

    for (let row = 1; row < GRID_ROWS - 1; row += 1) {
      for (let col = 1; col < GRID_COLS - 1; col += 1) {
        const isPillar = row % 2 === 0 && col % 2 === 0;
        const isSpawnSafeZone =
          (row === 1 && col === 1) || (row === 1 && col === 2) || (row === 2 && col === 1);
        if (!isPillar && !isSpawnSafeZone) {
          expect(state.grid[row][col].type).toBe('soft');
        }
      }
    }
  });

  it('keeps the spawn safe zone clear of soft blocks even when the RNG always favors placement', () => {
    const state = initGameState({ random: () => 0 });

    const safeZone = [
      [1, 1],
      [1, 2],
      [2, 1],
    ];
    safeZone.forEach(([row, col]) => {
      expect(state.grid[row][col].type).not.toBe('soft');
    });
  });

  it('conceals the exit under one of the placed soft blocks', () => {
    const state = initGameState({ random: () => 0 });

    expect(typeof state.exit.row).toBe('number');
    expect(typeof state.exit.col).toBe('number');
    expect(state.grid[state.exit.row][state.exit.col].type).toBe('soft');
  });

  it('does not crash when the RNG returns exactly 1 during enemy index selection', () => {
    const state = initGameState({ random: () => 1 });

    expect(state.enemies).toHaveLength(ENEMY_COUNT);
    state.enemies.forEach((enemy) => {
      expect(state.grid[enemy.row][enemy.col]).toBeDefined();
    });
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
});
