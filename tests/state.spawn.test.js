import { describe, it, expect, vi } from 'vitest';
import { initGameState } from '../src/state.js';
import { TILE_SIZE_PX } from '../src/constants.js';

// The real PLAYER_SPAWN is {1, 1}, where row === col, so a transposed x/y can't be told
// apart from a correct one. A spawn with row !== col makes that bug observable. It lives in
// its own file because vi.mock is hoisted and replaces constants for every test in a file.
vi.mock(import('../src/constants.js'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, PLAYER_SPAWN: Object.freeze({ row: 1, col: 3 }) };
});

describe('initGameState with a spawn where row !== col', () => {
  it('derives player x from the spawn column and y from the spawn row', () => {
    const state = initGameState();

    expect(state.player.x).toBe(3 * TILE_SIZE_PX);
    expect(state.player.y).toBe(1 * TILE_SIZE_PX);
  });
});
