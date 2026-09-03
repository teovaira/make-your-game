# Product Requirements Document: make-your-game

| | |
|---|---|
| **Document owner** | Theo (game logic) · Vasiliki (rendering & UI) |
| **Status** | v1.1 — genre locked, verified against 2026 sources |
| **Last updated** | 2026-08-30 |
| **Stakeholders** | Project team, school reviewer/grader (zone01) |
| **Genre** | **Bomberman** (from the pre-approved list) |

---

## 1. Overview

**make-your-game** is a single-player, browser-based **Bomberman** game built entirely with vanilla HTML, CSS, and JavaScript. No game frameworks, game engines (e.g. Phaser), or `<canvas>` rendering are permitted — all visuals must be produced and animated through real DOM elements. The team designs and implements its own lightweight "engine": a game loop, rendering layer, input handler, and collision system, built from scratch.

The project's central technical mandate — and its primary grading criterion — is sustained **60 FPS performance with zero dropped frames**, achieved and *proven* through correct use of browser rendering APIs and DevTools profiling, not by chance.

## 2. Background / Problem Statement

The assignment (zone01 curriculum) exists to teach the browser rendering pipeline, the JavaScript execution/event-loop model, and performance-conscious DOM manipulation — skills that are invisible when using a framework or canvas, which abstract them away. Building a real game without those abstractions forces direct engagement with:
- How `requestAnimationFrame` synchronizes with the browser's repaint cycle.
- Why certain CSS properties (`transform`, `opacity`) are cheap to animate and others (`top`, `left`, `width`) are expensive.
- How compositor layers trade GPU memory for rendering speed.
- How single-threaded JS execution causes visible jank when frame budgets are exceeded.

## 3. Goals & Success Metrics

| Goal | Success Metric |
|---|---|
| Steady 60 FPS gameplay | In a 10–20s Chrome DevTools Performance recording, the **Frames track** shows green frames throughout (no red "dropped" frames; ideally no yellow "partially presented" frames), and the **Frame rendering stats** overlay holds ~60 FPS |
| No dropped/janky frames | No frame exceeds the 16.7ms budget; no "Long Tasks" (>50ms, flagged with a red triangle) in the Main track |
| Only moving sprites repaint | **Paint flashing** (Rendering tab) highlights only the moving sprites — never the whole board or the scoreboard on every frame |
| Correct `requestAnimationFrame` usage | Single rAF loop; delta-time derived from the callback timestamp; loop is fully cancel/resumable |
| Refresh-rate independence | All movement computed as `speed × dt`; gameplay speed is identical on 60Hz, 120Hz, and 144Hz displays |
| Smooth, non-stuttering keyboard controls | Movement uses key-state tracking (keydown/keyup into a Set/object), read once per frame — never movement-per-keydown-event |
| Functional pause/restart | Pause fully halts the loop (`cancelAnimationFrame`) with zero frame drops while paused; Continue resumes without a time-jump; Restart re-initializes state cleanly |
| Working scoreboard | Timer, score, and lives update correctly and are driven by loop `dt`, not `setInterval` |
| Minimal-but-nonzero layer usage | Only actively-animating sprites (player, live enemies, active bomb/flame) carry `will-change: transform`; layer count ≈ number of moving sprites, verified via Rendering → **Layer borders** and the **Layers** panel |
| Code quality | Team's code adheres to the agreed standards (Section 8) — reviewable via PR checklist |

## 4. Scope

**In scope**
- One complete, playable game matching the genre mechanics of one game from the pre-approved list (Section 6.1).
- Custom game loop, rendering, input handling, and collision detection — all hand-built.
- Pause menu (Continue, Restart).
- Scoreboard (timer, score, lives).
- Performance verification via DevTools, documented.

**Out of scope**
- Multiplayer or networked play.
- Mobile/touch controls (keyboard-only per spec).
- Any external game engine, animation library, or `<canvas>`/WebGL rendering.
- Sound design (unless the team elects to add it — not a graded requirement).
- Asset pipeline / build tooling beyond what's needed for local development (optional, not required — see PRD constraints).

## 5. Target Users

- **Primary:** the project team members themselves, and the course grader/reviewer evaluating the deliverable against the stated objectives.
- **Secondary:** any player of the finished game — a general audience expecting a responsive, jank-free arcade experience with clear controls, score feedback, and pause/restart functionality.

## 6. Functional Requirements

### 6.1 Genre & Core Mechanics — **Bomberman** (locked)

Chosen for its excellent DOM fit: a deterministic tile grid with no physics simulation, which is the lowest-risk path to the 60 FPS requirement.

**Board**
- Grid of **13 columns × 11 rows** (143 tiles), rendered as DOM elements.
- Solid **hard blocks** form the outer border plus interior pillars on even-row/even-column tiles. Hard blocks are indestructible and stop blasts.
- **Soft blocks** are destructible, placed randomly on remaining tiles. Destroying one may reveal a power-up or the exit.
- Movement is 4-directional (up/down/left/right) only — no diagonals.

**Bombs & explosions**
- Player starts with **1 concurrent bomb** and **blast radius 1 tile**.
- Fuse: **3.0 seconds** (authoritative per StrategyWiki for Super Bomberman).
- Explosion is a **"+" cross** extending equally in all four directions; length = current blast radius.
- Flame is stopped by hard blocks, and is **consumed destroying exactly one soft block** (it does not continue past it).
- **Chain reactions:** a bomb caught in another bomb's blast detonates immediately.

**Player, enemies, and death**
- **3 starting lives** (classic max is 9 — extra lives are optional scope).
- The player dies from touching an enemy or being caught in any blast (including their own).
- **2–4 enemies** per level with simple AI (random-walk and/or chase). Any blast kills an enemy; enemies have 1 HP.
- On death, most power-ups are lost; firepower, bomb count, and speed persist (minor source conflict on speed — team may simplify).

**Power-ups (minimum viable set)**
| Power-up | Effect |
|---|---|
| Extra Bomb (`bombUp`) | +1 concurrent bomb |
| Fire / Explosion Expander (`fireUp`) | +1 blast radius in all directions |
| Speed / Accelerator (`speedUp`) | +1 movement speed |

*Optional stretch (not required):* Remote detonator, Kick, Bomb-pass, Block-pass, temporary invincibility.

**Win / lose conditions**
- **Win a stage:** destroy all enemies, then reach the exit (hidden under a soft block; opens only once all enemies are cleared).
- **Lose:** lives reach zero, or the stage countdown timer expires.
- Scope: one level is sufficient for the deliverable; additional levels are optional.

**Scoring**
- Points awarded per enemy killed (escalating by enemy type in the original: 100 / 200 / 400 / 800 …). A simplified flat or per-type table is acceptable.
- Simultaneous multi-kills scale the multiplier in the original; optional for this project.

*Note: exact per-stage time limit and pillar spacing are conventions, not authoritatively documented. ~200s and even/even pillars are the team's chosen defaults.*

### 6.2 Rendering & Animation
- All moving game objects are positioned via `element.style.transform` (`translate`/`translateX/Y`), never via `top`/`left`/`width`/`height`/`margin`.
- Fades/visibility transitions use `opacity` only.
- DOM structure: a fixed playfield container with absolutely-positioned child sprite elements. The board itself is a CSS grid of tile elements.
- **Containing-block constraint:** applying `transform` (or `will-change: transform`) to an element makes it the containing block for any `position: fixed` descendant. The pause overlay and scoreboard must therefore be **siblings of the board, outside any transformed or layer-promoted ancestor** — otherwise they will position relative to the board instead of the viewport.
- **Stacking context:** both `transform` (non-`none`) and `opacity` (< 1) create a new stacking context; z-ordering must be planned with this in mind.
- An element with `opacity: 0` is still focusable and still receives pointer events — a hidden pause overlay must also be removed from the tab order (see §6.5).

### 6.3 Game Loop
- Single `requestAnimationFrame` loop. rAF is one-shot — the callback must re-request each frame.
- Fixed-timestep (or delta-time-scaled) update logic, deriving `dt` from the rAF callback's `DOMHighResTimeStamp` argument (which represents the end time of the previous frame's rendering).
- **Delta-time rule (mandatory):** all movement and timers are computed as `speed × dt`. Never move by a fixed per-frame constant — MDN explicitly warns that ignoring the timestamp makes animation run faster on high-refresh-rate screens. Graders may profile on 120/144Hz displays, where a per-frame constant would run up to 2.4× too fast.
- `dt` is clamped (e.g. to 100ms) to survive tab stalls without a physics explosion.
- Loop schedules the next frame first, then processes input, updates state, and renders.
- `cancelAnimationFrame` stops the loop cleanly on pause; resuming resets the delta baseline (`lastTime = null`) to avoid a time-jump. Store the request ID in a variable initialised to `null`, not `0` (per MDN, IDs can overflow and `0` is an unsafe sentinel).

### 6.4 Input Handling
- Keyboard-only controls.
- A `keysPressed` state object/Set is updated on `keydown`/`keyup`; the loop reads this state each frame to drive movement.
- `blur` (or `visibilitychange`) listener clears pressed-key state on focus loss to prevent "stuck" keys.
- `preventDefault()` on game-control keys to stop unwanted page scroll.

### 6.5 Pause Menu
- **Continue** — resumes the loop without a time discontinuity.
- **Restart** — resets game state (score, lives, timer, positions) and restarts the loop.
- While paused, the loop must not run — `cancelAnimationFrame` fully halts it, so zero frame budget is consumed. *This satisfies the spec's "frames should not drop if paused" by construction, since no frames are being produced at all.*
- Implemented as a **native `<dialog>` opened with `showModal()`**, which provides focus trapping, `Escape`-to-close, and focus restoration without custom code. If a custom overlay is used instead, it must set `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, move focus to the first control on open, trap Tab/Shift+Tab, restore focus on close, and make the background `inert`.
- Continue/Restart buttons must have a visible focus indicator.
- Escape must always reach the pause menu during play — no keyboard trap.

### 6.5b Game Over / Win States
- **Game over** when lives reach zero or the countdown timer expires; **win** when all enemies are cleared and the player reaches the exit.
- Both states halt the loop and present a clear result screen with a Restart option.

### 6.6 Scoreboard
- **Timer** — counts up (elapsed) or down (countdown), driven by accumulated loop `dt`.
- **Score** — current points/XP, updated on scoring events.
- **Lives** — remaining lives, updated on loss events.
- All three render via text-content updates only (no layout-triggering changes).

### 6.7 Collision Detection
- Custom-built (e.g. AABB rectangle-overlap checks), reused via a single shared function per the DRY principle — not duplicated per object type.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Sustained 60 FPS; frame time ≤16.7ms; zero Long Tasks (>50ms) on main thread during normal play |
| Layer usage | Minimal but nonzero — only continuously-animating elements promoted via `will-change: transform` |
| Memory | Reuse objects/arrays in the hot loop rather than allocating per-frame, to limit GC-triggered pauses |
| Compatibility | Must run correctly in evergreen Chromium-based browsers at minimum (Chrome DevTools is the primary profiling tool). Firefox DevTools is an acceptable secondary check, per the spec's tool list |
| Accessibility | Honor `@media (prefers-reduced-motion: reduce)` for non-essential motion (screen shake, explosion scaling, menu transitions) — essential gameplay motion is retained. Pause menu meets modal-dialog focus requirements (§6.5) |
| Verifiability | Performance claims must be demonstrated via recorded DevTools Performance sessions — **Frames track** (green/yellow/red per-frame), **Frame rendering stats** overlay, **Paint flashing**, and **Layer borders / Layers panel** — recorded during play, during pause, and across resume. Asserted-but-unrecorded claims do not satisfy the spec |

## 8. Technical Constraints & Code Standards

**Hard constraints (non-negotiable per spec):**
- No frameworks, no game engines, no `<canvas>`/WebGL.
- Plain HTML + CSS + JavaScript only.
- Keyboard-only input.

**Team code standards (adopted from course good-practices guidance):**
- DRY, KISS, YAGNI, SOC (rendering / game-state / input kept in separate modules).
- Consistent naming (camelCase), consistent indentation, meaningful comments (no restating-the-obvious).
- Explicit error handling; avoid deep nesting; reasonable line-length limits.
- Data/config (level layouts, tetromino shapes, enemy patterns, etc.) kept separate from logic — as data structures, not hardcoded values.

**Tooling (dev-time only, never a runtime dependency):**
- No build step — the shipped game runs by opening `index.html` directly or via a static server.
- Node.js is used only for team tooling: **Vitest + jsdom** (unit tests), ESLint, Prettier, optional local dev server.
- **Testability rule:** game logic (grid, bombs, blast propagation, collision, scoring, timers) is written as **pure functions taking `dt` as a parameter**, engine-agnostic and testable with no DOM and no timers. The rAF loop and DOM renderer stay a thin, separately-tested shell. Target: the large majority of logic testable without touching rAF.
- **Vitest gotcha to document:** fake timers do not mock `requestAnimationFrame`, `cancelAnimationFrame`, or `performance` by default. Set `fakeTimers.toFake` explicitly to include them, use `vi.advanceTimersToNextFrame()` to step one frame, and restore with `vi.useRealTimers()` in `afterEach`.

## 9. Assumptions & Dependencies

- Grading/testing will primarily use Chrome DevTools (Performance panel, FPS meter, Layer borders) — per the spec's explicit tool guidance.
- The school's good-practices reference doc (zone01 platform) is authoritative for performance and code-quality expectations and has been fully reviewed by the team.
- Team has access to Chromium-based browsers for consistent profiling results across members.

## 10. Risks & Open Questions

| Risk / Question | Mitigation / Next Step |
|---|---|
| ~~Genre not finalized~~ | **RESOLVED — Bomberman selected** |
| Team searches for the old DevTools "FPS chart" and can't find it | Panel was redesigned; use the Frames track + Frame rendering stats (§7). Both members practice on the official jank demo before the graded profiling run |
| `position: fixed` overlays break when nested inside the transformed board | Keep pause/scoreboard overlays as siblings of the board — enforced in code review (§6.2) |
| "Layer explosion" from over-applying `will-change` | Code review checklist item; verify layer count ≈ moving-sprite count via Layer borders before merging |
| Garbage-collection pauses from per-frame allocations | Enforce object reuse pattern in loop-critical code during review; audit in the performance phase |
| Bomb chain-reaction logic causes an unbounded loop / long task | Cap chain depth per frame; profile with several bombs chained |
| Tests silently pass because rAF isn't actually faked | Explicit `fakeTimers.toFake` config (§8); verify fake-timer behavior in the installed Vitest version |
| Team member unfamiliarity with rendering pipeline concepts | Reference the shared research summary and the source-audit document before implementation begins |

## 11. Milestones

High-level phases only — the detailed task breakdown, shared contracts, and per-person assignment live in `ROADMAP.md`.

1. **Architecture & setup** — shared constants, game state shape, loop skeleton, keyboard input handler, playfield DOM.
2. **Core rendering & mechanics** — movement, bombs, blast propagation, chain reactions, collision, enemy AI; grid and sprite rendering.
3. **UI layer** — pause dialog, scoreboard, score/lives/win-condition logic, game-over/win states, integration wiring.
4. **Performance verification** — DevTools profiling (Frames track, Frame rendering stats, Paint flashing, Layer borders), allocation audit, layer audit. **Findings recorded as a deliverable, since the spec states performance will be tested.**
5. **Polish & submission** — code-standards pass, accessibility check, final playtest, documentation.

## 12. References

- freeCodeCamp — [Web Animation Performance Fundamentals](https://www.freecodecamp.org/news/web-animation-performance-fundamentals/)
- MDN — [`transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform), [`opacity`](https://developer.mozilla.org/en-US/docs/Web/CSS/opacity), [`will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change), [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [JS Execution Model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model), [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- Chrome for Developers — [Performance features reference](https://developer.chrome.com/docs/devtools/performance/reference) *(current UI — use this over the older tutorial)*, [Discover issues with rendering performance](https://developer.chrome.com/docs/devtools/rendering/performance)
- MDN — [What are browser developer tools](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools)
- Addy Osmani — [Making a Site Jank-Free](https://addyosmani.com/blog/making-a-site-jank-free/) *(concepts current; DevTools UI shown is outdated)*
- Chrome DevTools Jank Sample — [demo](https://googlechrome.github.io/devtools-samples/jank/) *(still maintained; use to practice reading the panel)*
- Super Bomberman mechanics — [Wikipedia](https://en.wikipedia.org/wiki/Super_Bomberman), [StrategyWiki gameplay](https://strategywiki.org/wiki/Super_Bomberman/Gameplay)
- zone01 platform — internal good-practices / game-performance reference doc *(reviewed in full)*
- Team's internal research summary: *Building a Vanilla DOM-Based 60 FPS Browser Game*
- Team's source audit: *Bomberman DOM Game (zone01): 2026 PRD and Roadmap Verification Audit*
