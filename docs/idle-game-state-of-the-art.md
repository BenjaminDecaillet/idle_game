# Idle/incremental games — state of the art & what Idle Silicon Valley should steal

Compiled 2026-08-04 from three parallel research sweeps: open-source repositories
(licences checked against actual LICENSE files), genre design theory (Pecorella's
math series, GDC talks, CHI papers), and UI/UX + QoL conventions. Policy applied
throughout: **ideas are adapted, code is never copied**; each repo entry records the
licence that was checked. Two sources (Kittens Game, the Cookie Clicker mirror) are
not open source — mechanics inspiration only, nothing copyable.

## How to read this

Each entry: source → licence → what it does well → how it would apply to Idle
Silicon Valley (ISV). The final section ranks everything by value/effort and says
what was implemented right away vs. sent to `improvements.md`.

---

## 1. Open-source repositories

### Progress Knight — https://github.com/ihtasham42/progress-knight
- **Licence:** The Unlicense (public domain).
- **Does well:** careers-as-progression: jobs are tiered ladders with visible
  requirements, skills grant compounding multipliers, rebirth keeps skill-derived
  bonuses. The player always sees the next two goals.
- **ISV application:** "alumni mastery" — account-level per-role XP that survives
  prestige and grants small permanent training-speed/output multipliers per role.
  Reuses durable counters, so story/mission-safe.

### Evolve — https://github.com/pmotschmann/Evolve
- **Licence:** MPL-2.0.
- **Does well:** multiple qualitatively different prestige reset types, each with
  its own meta-currency and permanent shop; build/research queues with time
  estimates; challenge modifiers multiplying prestige gains.
- **ISV application:** differentiated exits — Acquisition (early), IPO (mid),
  Conglomerate spin-off (late), each keyed to a different durable metric
  (valuation / headcount / countries). Natural long-horizon mission chains.

### A Dark Room — https://github.com/doublespeakgames/adarkroom
- **Licence:** MPL-2.0.
- **Does well:** the UI is the story — tabs and subsystems materialize when state
  thresholds cross; sparse prose; zero-tutorial onboarding.
- **ISV application:** progressive disclosure bound to durable state: hide
  panels/tabs until a story beat unlocks them and make the unlock the beat's
  payoff ("Gabriel slides a keycard across the desk — Floor 2 is yours").

### Kittens Game — https://github.com/nuclear-unicorn/kittensgame
- **Licence:** custom "WET PAWS" licence — personal/educational only, **not open
  source**. Ideas only; no code, data or text may be taken.
- **Does well:** the genre's best worker economy (assignment is a real decision),
  storage caps forcing infrastructure, seasons creating rhythm.
- **ISV application:** deterministic quarterly market seasons (boom / stable /
  crunch / recovery) multiplying sector payouts, computed from elapsed game time
  inside `tick()` — offline-safe, no randomness, natural mission hook.

### Antimatter Dimensions — https://github.com/IvarK/AntimatterDimensionsSourceCode
- **Licence:** MIT.
- **Does well:** best-tuned reset cadence in the genre; achievements grant real
  multipliers (a parallel goal chain); **automation is the reward** — autobuyers
  unlock progressively, converting tedium into anticipation.
- **ISV application:** earned automation — auto-restart training, auto-hire,
  auto-buy desks as milestone/mission rewards, with a VsCoin early-unlock tier
  (sells convenience, not power).

### Trimps — https://github.com/Trimps/Trimps.github.io
- **Licence:** GPL-2.0.
- **Does well:** population as workforce+army capped by housing, so expansion is
  always the fought-over bottleneck; prestige awards respec-able point-buy perks.
- **ISV application:** validates the desk-slot headcount cap (shipped this
  session); when prestige deepens, award allocatable "founder points" instead of
  flat bonuses.

### Synergism — https://github.com/Pseudo-Corp/SynergismOfficial
- **Licence:** MIT. TypeScript.
- **Does well:** layered currencies each with their own upgrade tab; timed
  challenges; an explicit itemized offline-progress report on load.
- **ISV application:** the welcome-back report — itemize cash, completed
  trainings/promotions, floors finished and missions progressed while away,
  on top of the existing offline modal/doubler.

### Swarm Simulator — https://github.com/erosson/swarm
- **Licence:** GPL-3.0.
- **Does well:** "units buy units" producer chains; closed-form offline progress
  (exact for arbitrary durations).
- **ISV application:** a Recruiters tier that generates hiring candidates or
  junior hires over time — buy recruiting capacity instead of clicking hires.

### IdleSpace — https://github.com/scorzy/IdleSpace
- **Licence:** MIT. (Same author's IdleAnt also MIT.)
- **Does well:** TypeScript structure; reassignable drone workforce; prestige
  tree with chosen branches; time-warp items ("N hours of production now").
- **ISV application:** time-warp rewards implemented by literally running the
  offline simulation for N hours — guaranteed consistent because it *is* the
  real progression path.

### Level13 — https://github.com/nroutasuo/level13
- **Licence:** Apache-2.0.
- **Does well:** dual loop (safe camp economy + risky exploration); each city
  level is a self-contained chapter.
- **ISV application:** market-scouting expeditions before country unlocks — a
  timed action returning a "market report" (flavor + economy preview), turning
  expansion into an authored chapter opening.

### Cookie Clicker (unofficial mirror) — https://github.com/ozh/cookieclicker
- **Licence:** none — proprietary (Orteil/DashNet), mirror only. **Ideas only.**
- **Does well:** golden cookies (presence-rewarding micro-events), synergy
  upgrades keeping every building relevant, achievements→milk multiplier, slow
  daily currency (sugar lumps), autosave transparency.
- **ISV application:** presence-gated "viral moment" clickables (online-only by
  design, so offline sim is untouched); a slow daily-cadence currency for
  retention. Partially covered already by daily contracts + random events.

### Profectus — https://github.com/profectus-engine/Profectus
- **Licence:** MIT.
- **Does well:** prestige layers as declarative data configs consumed by one
  generic engine routine.
- **ISV application:** architectural reference — when prestige layers multiply,
  declare them in `data.ts` and keep one engine routine, matching the existing
  balance-data rule.

### Checked, not usable as open source
- **Melvor Idle** — official repo has no source, proprietary. Remember: many
  parallel skills each a slot-in idle loop, per-item mastery tracks.
- **NGU Idle / Exponential Idle** — closed source (Exponential Idle's theory SDK
  is public). Player-chosen reset ratio ("publications") is an elegant
  micro-prestige.
- **break_infinity.js** — https://github.com/Patashu/break_infinity.js — MIT;
  the standard mantissa+exponent number lib if balance ever exceeds 1e308 (could
  be depended on directly under MIT).
- **GodotProjectZero** — MIT code / CC assets, GDScript; duplicates A Dark
  Room's staged-reveal idea.

---

## 2. Design theory worth binding to

- **Pecorella, "The Math of Idle Games" I–III** (gamedeveloper.com) — cost curves
  `b·r^k` with r ∈ 1.07–1.15; milestone step-multipliers to fix generator
  relevancy; payback-time as *the* balancing instrument; prestige currency as a
  fractional power of run earnings. ISV already has a balance harness
  (`npm run balance:sim`); adding payback-time display on purchase buttons and
  ownership milestone multipliers are the two unclaimed wins.
- **GDC 2015/2016 idle talks (Kongregate)** — the three-horizon test: at any
  moment the player should name a next-minute buy, a this-session unlock, and a
  this-week milestone. Audit ISV at 30 min / 1 day / 1 week simulated marks.
- **AdVenture Capitalist postmortem + Alharthi et al. CHI 2018** — the return
  moment is the highest-emotion beat in an idle game; itemize what happened,
  don't just add money silently. ISV has the modal + doubler; itemization is the
  missing piece.
- **Universal Paperclips (Lantz)** — acts that retire mechanics and change the
  verb set; a promised ending. ISV's country/prestige arc could adopt per-country
  signature mechanics.
- **Failure modes consolidated** (Machinations, Eric Guan, community): dead time
  with nothing worth buying; walls arriving before their resolving mechanic;
  strictly-dominant purchases; background-tab pause bugs (ISV is timestamp-based
  — protected); returning-player disorientation (ISV's goal chip covers this).

## 3. UI/UX & QoL conventions

- **Compositor-only animation** (transform/opacity, no filters) — ISV's art-svg
  rules already comply; keep looping scene animations phase-stable across
  re-renders via seeded negative `animation-delay`.
- **`<symbol>`/`<use>` scene instancing** — worth it when office scenes pass ~20
  animated personas.
- **Floating "+$" numbers** — pooled span overlay, coalesce bursts, reserve big
  pops for VsCoin/milestones; gate behind `prefers-reduced-motion`.
- **`tabular-nums` + display-value lerp** on the HUD — cheapest perceived-quality
  win (ISV already sets tabular-nums on money; extend to all numeric HUD/stat
  elements).
- **Smooth timer bars** — drive visible bars from state in the 60 fps loop with
  `scaleX` (ISV now does targeted-write live bars for training tiles; same
  pattern generalizes).
- **Bulk buy ×1/×10/×Max** — closed-form geometric-series cost + max-affordable
  in the engine, segmented control in the UI. Table stakes for the genre.
- **Export/import saves** — base64 text + file download, import through the
  normal load path. Urgent for a localStorage-only PWA under a beta-reset
  policy.
- **Reduced-motion + FX toggles; pause scene animation when `document.hidden`.**
- **Colorblind-safe redundancy** — never encode affordability by hue alone;
  Okabe-Ito palette for categorical UI colors.
- **App badge (`navigator.setAppBadge`)** for finished trainings/claimable
  missions — no permission prompt, no backend; skip push entirely.
- **Offline cap as content** — show the cap honestly in the welcome-back modal
  and sell/award cap extensions ("cloud infrastructure upgrades").

---

## 4. Ranked shortlist (value ÷ effort ÷ risk)

| # | Idea | Value | Effort | Decision |
|---|------|-------|--------|----------|
| 1 | Export/import saves | very high | low | **implement now** |
| 2 | Bulk buy ×1/×10/×Max for desks | very high | low-med | **implement now** |
| 3 | Welcome-back itemized report | high | low-med | **implement now** (extends existing modal) |
| 4 | Earned automation (auto-train/auto-hire unlocks) | high | med | backlog |
| 5 | Achievements with small multipliers | high | med | backlog (plan.md already lists) |
| 6 | Ownership milestone multipliers (25/50/100) | high | med | backlog (balance work) |
| 7 | Payback-time display on purchase buttons | med-high | low | backlog |
| 8 | Quarterly market seasons | med-high | med | backlog |
| 9 | App badge for finished timers | med | low | backlog |
| 10 | Recruiters (producer-of-producers) | med | med | backlog |
| 11 | Market-scouting expeditions per country | med | med | backlog |
| 12 | Differentiated exit types / founder points | med (late-game) | high | backlog, post-1.0 |
| 13 | Viral-moment presence events | med | med | backlog (random events exist; this is the clickable variant) |
| 14 | `<symbol>`/`<use>` scene refactor | med | med | backlog, when persona count grows |
| 15 | Floating-number overlay | med | med | backlog (fx.ts has payout bursts already) |

Implementation picks (1–3) were chosen because each is proven across multiple top
games, touches no balance curves, requires no `GameState` reshape (or only an
additive one), and lands player-visible value immediately. Everything else is
appended to `docs/improvements.md`.
