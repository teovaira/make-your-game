export const GRID_COLS = 13; // Super Bomberman is 13x11
export const GRID_ROWS = 11;
export const TILE_SIZE_PX = 40;
export const TICK_MS = 1000 / 60; // fixed timestep
export const MAX_DELTA_MS = 100; // dt clamp so a tab stall doesn't cause a physics jump

export const BOMB_FUSE_MS = 3000; // StrategyWiki: 3.0s fuse — not the commonly-cited 2500
export const EXPLOSION_DURATION_MS = 500;

// Tuning values, not researched — no source pins an exact number, it's a feel decision.
// Retune once Phase 2 movement is testable in-browser; the speed * dt scaling won't change.
export const PLAYER_SPEED = 0.15; // px/ms — crosses one 40px tile in ~267ms
export const ENEMY_SPEED = 0.1; // px/ms — ~400ms/tile, slower than the player by design

// Probability an eligible interior tile becomes soft during grid generation. The realized
// count can differ slightly from the roll in either direction: buildGrid forces one soft
// block if none were rolled (so an exit can be concealed) and reclaims soft blocks if too
// few walkable tiles are left for ENEMY_COUNT enemies.
export const SOFT_BLOCK_DENSITY = 0.6;

export const ENEMY_COUNT = 3; // one fixed level, so a single value instead of a 2-4 range

// Player's starting tile. Also anchors the 3-tile spawn safe zone (this tile, one right,
// one down) that's excluded from soft-block placement and enemy spawns. That shape assumes
// a top-left spawn — moving this toward another corner puts the zone on border walls, so
// isInSpawnSafeZone would need reworking too.
export const PLAYER_SPAWN = Object.freeze({ row: 1, col: 1 });

export const DEFAULT_MAX_BOMBS = 1;
export const DEFAULT_BLAST_RADIUS = 1; // tile
export const DEFAULT_LIVES = 3; // classic max is 9; this is the starting count

export const STAGE_TIME_LIMIT_MS = 200000; // ~200s, a convention rather than a fixed rule

// Two-tier scoring (walker/chaser) instead of the original's four-tier 100/200/400/800.
export const ENEMY_POINTS = Object.freeze({
  walker: 100,
  chaser: 200,
});

// AI-type registry — kept separate from ENEMY_POINTS (a scoring table) even though today
// every AI type has a matching score entry. If you add an AI type, you'll usually want to
// add a score entry too, but the two lists are allowed to diverge.
export const ENEMY_AI_TYPES = Object.freeze(['walker', 'chaser']);

// Arrows + WASD both bound; Space for bomb; Escape is fixed (not remappable) so it can
// always reach the pause menu even mid-play.
export const KEY_BINDINGS = Object.freeze({
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  ' ': 'bomb',
  Escape: 'pause',
});
