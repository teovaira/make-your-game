# Research Summary: Building a Vanilla DOM-Based 60 FPS Browser Game

Both Theo and Vasiliki maintain this file — record findings from the self-research topics listed per phase in ROADMAP.md §5, so the reasoning behind non-obvious decisions is written down rather than living only in one person's head.

## Theo — game logic / engine

- [ ] Fixed-timestep accumulator pattern (Phase 1)
- [ ] rAF timestamp semantics (Phase 1)
- [ ] Key-state tracking vs. keydown-driven movement (Phase 1)
- [ ] Chain-reaction explosion algorithms (Phase 2)
- [ ] AABB collision detection (Phase 2)
- [ ] Simple enemy AI patterns for Bomberman (Phase 2)
- [ ] Timer accumulation without `setInterval` (Phase 3)
- [ ] Delta-baseline reset on resume (Phase 3)

## Vasiliki — rendering & UI

- [ ] `will-change` / compositing layers (Phase 1)
- [ ] BEM methodology (Phase 1)
- [ ] Movement with delta time (Phase 2)
- [ ] Grid↔pixel coordinate conversion (Phase 2)
- [ ] Transform vs. layout-triggering properties (Phase 2)
- [ ] `prefers-reduced-motion` (Phase 2)
- [ ] Native `<dialog>`/`showModal()` focus semantics (Phase 3)
- [ ] Bomberman scoring/win-condition rules (Phase 3)

Each entry: link/note + one-paragraph takeaway once researched, per ROADMAP.md's self-research sections.
