# Agent Instructions for Idle Silicon Valley Development

How to work with an AI agent on this project.

> **v2.0 (July 2026):** the project moved from Godot to a **TypeScript + Vite PWA** so it can be built, unit-tested and deployed headlessly. Phases 1–5 of the original plan are implemented — see `docs/plan.md` for status and the roadmap.

The agent-facing ground rules live in **`CLAUDE.md`** (auto-loaded every session) and the per-task detail lives in **`.claude/skills/`** (loaded on demand); the architecture map and troubleshooting table are in the `codebase-overview` skill. This file only keeps what's useful to the *human* driving the agent: example prompts and the delivery checklist. Session-efficiency habits are in `.claude/WORKING-METHOD.md`.

## Example prompts

- *Content:* "Add 3 late-game projects after 'AGI Research Lab' in `data.ts` with smooth cost/reward continuation, and a test asserting projects.json ordering by unlockCost."
- *Feature:* "Implement prestige: an `ipo()` action in engine.ts that resets state but grants a permanent output multiplier `1 + log10(totalEarned/1e6)`; migrate old saves; add UI on the Stats tab; unit-test the multiplier math."
- *Balance:* "Early game feels slow — raise Intern baseRate to 0.6 and cut Landing Page baseWork to 25, then update the affected test expectations."
- *UI:* "Add a sparkline of money over the last 10 minutes to the Stats tab; sample in main.ts, render as inline SVG, no new dependencies."
- *Monetization:* "Build the Shop tab from docs/monetization.md Phase 2: three rewarded-ad offers (2× for 4h boost, 1h time skip, free reroll) calling `grantBoost`/`timeSkip` through a `showRewardedAd(placement)` adapter that in dev resolves after a fake 5s countdown; daily cap of 6 stored in GameState (migrate!); unit-test the cap logic."

## Delivery checklist

- [ ] Core loop works without any clicking once a worker + desk exist
- [ ] `npm test` and `npm run build` pass
- [ ] Old saves still load (test with an export code from the previous version)
- [ ] Mobile layout (390 px) and desktop both look right
- [ ] `docs/plan.md` status/roadmap updated
