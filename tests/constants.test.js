import { describe, it, expect } from 'vitest';
import { PLAYER_SPAWN, ENEMY_AI_TYPES, ENEMY_POINTS, KEY_BINDINGS } from '../src/constants.js';

describe('constants', () => {
  // Restart re-runs initGameState() against these same module-level objects for the whole
  // session, so one accidental write anywhere would silently corrupt every later game.
  it.for([
    { name: 'PLAYER_SPAWN', value: PLAYER_SPAWN },
    { name: 'ENEMY_AI_TYPES', value: ENEMY_AI_TYPES },
    { name: 'ENEMY_POINTS', value: ENEMY_POINTS },
    { name: 'KEY_BINDINGS', value: KEY_BINDINGS },
  ])('freezes $name so it cannot be mutated at runtime', ({ value }) => {
    expect(Object.isFrozen(value)).toBe(true);
  });
});
