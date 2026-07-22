# Monetization plan — Idle Silicon Valley

A step-by-step plan to take the game from free hobby project to revenue, tailored to what it is today: a web-first PWA idle game with no accounts and no backend.

**Guiding principle for idle games: you sell *time and convenience*, never progress-gates.** The game must stay fully playable and fun for free; paying players just move faster or skip waiting. Players who feel respected retain, and retention is what monetizes.

## The strategy in one paragraph

Grow an audience first (web portals + PWA), monetize attention with **rewarded ads** (player opts in, watches an ad, gets a boost — the model idle players actually like), then add a small set of **one-time purchases** for the players who want more, and only wrap the game as a **store app** once web numbers prove demand. Retention before monetization: a game with bad Day-1 retention earns nothing no matter how clever the shop is.

---

## Phase 0 — Measure first (do this before any monetization)

You can't tune what you can't see. Targets to beat before investing in ads/IAP: **D1 retention > 25–30%**, median session > 5 min.

| Step | Action | Resource |
|---|---|---|
| 0.1 | Add privacy-friendly analytics (page views, DAU, referrers). No consent banner needed if cookieless. | [Plausible](https://plausible.io) (paid, simple) or [PostHog](https://posthog.com) (free tier, funnels + retention charts) |
| 0.2 | Instrument game events: session start/end, hires, unlocks, completions, offline-return, boost usage (`Boost.source` field already exists for this). Keep one tiny `track(event, props)` wrapper in `src/ui/` so `src/game/` stays pure. | PostHog JS snippet |
| 0.3 | Define the funnel: install → first hire → first desk → first unlock → return next day. Fix the biggest drop-off before monetizing. | PostHog funnels |
| 0.4 | Publish a privacy policy page (required as soon as any analytics/ads exist). | [termly.io](https://termly.io) / [iubenda](https://www.iubenda.com) generators |

## Phase 1 — Engine groundwork ✅ (already implemented)

The delivery mechanisms every monetization trick needs are in `src/game/engine.ts`, unit-tested, save-migrated:

- `grantBoost(state, mult, durationSec, source)` — timed output multipliers (HUD shows a pulsing 🚀 badge; works correctly across offline simulation; `source` tags 'ad'/'iap'/'event' for analytics).
- `timeSkip(state, seconds)` — instantly simulates N seconds through the real tick.
- Try them today in DevTools: `isv.boost(2, 240)`, `isv.skip(3600)`.

What's still needed here: a **Shop/Boost tab in the UI** listing the boost/skip offers, calling these functions once the ad or payment callback confirms. Build it when Phase 2 starts.

## Phase 2 — Rewarded ads on the web

Rewarded ads are the top earner in idle games and the least resented: the player *chooses* to watch. Non-optional banners/interstitials earn little on web and hurt retention — skip them.

| Step | Action | Resource |
|---|---|---|
| 2.1 | Easiest path: publish the game on web-game portals that bring **both the traffic and the ad SDK with rev-share**. Integrate their SDK behind one interface. | [CrazyGames dev portal](https://developer.crazygames.com), [Poki for developers](https://developers.poki.com) — idle games perform very well there |
| 2.2 | For your own domain: Google **H5 Games Ads** (AdSense for games, Ad Placement API) provides rewarded ads on web. Requires AdSense account + decent traffic. | [H5 Games Ads](https://ads.google.com/intl/en/home/h5-games-ads/) |
| 2.3 | Wrap whichever SDK in one adapter: `showRewardedAd(placement): Promise<boolean>` → on success call `grantBoost`/`timeSkip`. Keep `src/game/` SDK-free. | — |
| 2.4 | EU/CH users seeing personalized ads ⇒ consent banner (TCF-certified CMP). | Google Funding Choices (free), [Cookiebot](https://www.cookiebot.com) |

**Proven rewarded placements for this game** (implement in this order):

1. **Double offline earnings** — button on the "Welcome back" modal: watch ad → 2× the modal amount. Highest conversion placement in the genre; the player is already looking at a number they want doubled.
2. **Temporary boost** — "📺 Watch ad → 2× income for 4h" button near the HUD (`grantBoost(state, 2, 4*3600, 'ad')`). Cap ~6/day.
3. **Time warp** — "Skip 1 hour" (`timeSkip(state, 3600)`) on the Projects tab.
4. **Free candidate reroll** — ad instead of paying the reroll cost (uses existing `rollCandidates`).

## Phase 3 — In-app purchases on the web

Add IAP only once analytics show a retained core (players with >3 days of play). On the open web, use a **Merchant of Record** — they handle worldwide VAT/sales tax for you, which as a Swiss individual/small company you really don't want to do yourself with Stripe directly.

| Step | Action | Resource |
|---|---|---|
| 3.1 | Pick a Merchant of Record with overlay checkout. | [Paddle](https://www.paddle.com), [Lemon Squeezy](https://www.lemonsqueezy.com) (simplest for indies) |
| 3.2 | Purchases need to survive reinstalls ⇒ you now need a tiny backend + accounts, or start with the pragmatic hack: deliver entitlements into the save (works today, restorable via the existing save-code export/import) and add real accounts later. | Supabase / Firebase free tier when ready |
| 3.3 | Wire checkout success webhooks/callbacks → grant entitlement → `grantBoost` / permanent flag in `GameState` (extend `migrate()`!). | — |
| 3.4 | Terms of sale + refund policy pages. | MoR templates |

**Catalog that fits this game** (small, clear, no gacha):

| Product | Suggested price | Why it works |
|---|---|---|
| ☕ Starter Pack: instant $-bundle + 24h 2× boost, **one-time only** | CHF 2–3 | Converts first-payers; shown once, after the player's first project unlock (they now understand value) |
| 🚀 Founder Edition: **permanent 2× income** + remove ads + gold company-name badge | CHF 6–10 | The genre's #1 seller: one respectful "support the dev + big QoL" purchase |
| ⏩ Time warps: 8h / 24h skips | CHF 1–4 | Direct use of `timeSkip`; consumable revenue from engaged players |
| 🧢 Cosmetics: office themes / app icon colors | CHF 1–2 | Zero balance impact; add once there's an audience |

**Skip**: subscriptions (needs live-ops content you don't have) and loot boxes (regulatory + ethical minefield).

## Phase 4 — App stores (when web proves demand)

A store app multiplies reach and makes payments frictionless, but adds 15–30% fees and review overhead. Signal to proceed: >500 DAU or ad revenue > CHF 100/month on web.

| Step | Action | Resource |
|---|---|---|
| 4.1 | Wrap the PWA with **Capacitor** (planned option from the start; Vite build drops in unchanged). | [capacitorjs.com](https://capacitorjs.com) |
| 4.2 | Native rewarded ads: AdMob via the community Capacitor plugin. | [@capacitor-community/admob](https://github.com/capacitor-community/admob) |
| 4.3 | Native IAP with receipt handling + cross-platform entitlements. | [RevenueCat](https://www.revenuecat.com) (free < $2.5k/mo revenue) + its Capacitor SDK |
| 4.4 | Store listings: screenshots from the E2E harness, keywords ("idle tycoon startup"). Google Play first (CHF 25 once, lighter review), then iOS (USD 99/yr). | — |
| 4.5 | Android quick-win alternative: publish the PWA as a **TWA** (no wrapper code at all), but note Play billing rules then require Play's payment system for digital goods — fine for the ad-only stage. | [Bubblewrap / PWABuilder](https://www.pwabuilder.com) |

## Phase 5 — Grow the audience (monetization's fuel)

- Publish on **itch.io** (free, instant) and apply to **CrazyGames/Poki** (their curation = traffic firehose if accepted; both love polished idle games).
- Post progress + playable link on r/incremental_games — the genre's core community; brutal but useful feedback and a real player influx.
- Ship one **content/event update per month** (the roadmap's random events / achievements double as re-engagement hooks). Announce in-game.
- PWA push notifications later ("your team earned $X while away") — big retention lever, but ask permission only after a session or two, never on first load.

---

## Tips & tricks that make idle-game monetization actually work

**Design & psychology**
1. **Sell time, not power over others** — single-player idle means nobody is "pay-to-win"; frame everything as "your company works faster".
2. **The offline-earnings doubler is your #1 placement.** The player already sees money they "earned"; doubling it feels like a gift, not a purchase. Start there.
3. **Show, don't gate**: locked projects with visible names/prices already create desire (the game does this). Apply the same pattern to boosts: show the 2× button always; it's an ad-watch away.
4. **First offer timing**: never show purchase prompts in the first session. Trigger the Starter Pack after a clear investment signal (first project unlock ≈ minute 5–10 of play).
5. **Anchor prices**: a CHF 20 "whale" bundle makes the CHF 7 Founder Edition look reasonable. Always 3 price points.
6. **One-time > subscription** for this genre/size: "pay once, permanent 2×" converts far better than any recurring plan and generates goodwill.
7. **Cap ad frequency** (e.g. 6 rewarded/day): scarcity keeps eCPM and the ads feeling special, and protects session quality.
8. **Piggy-bank mechanic** (later): a % of earnings accumulates in a "vault" the player can unlock via ad or purchase — top-3 converting mechanic across the genre.
9. **Balance rule**: rewarded boosts should be strong (2×, hours) — generous free rewards *increase* eventual IAP conversion in idle games; stingy games just churn players.

**Business & legal (Switzerland/EU)**
10. **Merchant of Record over raw Stripe** until revenue justifies your own VAT handling — Paddle/Lemon Squeezy make the tax problem theirs.
11. **Consent before personalized ads** (GDPR + Swiss nFADP): use a TCF CMP; offer "non-personalized ads only" as the reject path.
12. If the theme could attract minors, avoid targeted ads entirely and check store age-rating questionnaires honestly (IARC).
13. **No dark patterns**: no fake timers, no "only 1 left!", no confirm-shaming. Besides ethics, EU consumer law is tightening on exactly these.
14. Keep purchases restorable — save-code export today, accounts later. Lost purchases = refunds + 1-star reviews.

**Metrics to watch (weekly)**
- **ARPDAU** = revenue / DAU (idle web games: $0.01–0.05 is normal, >$0.10 is good)
- **Rewarded engagement rate** = % of DAU watching ≥1 rewarded ad (aim 20–40%; below 10% ⇒ placements are invisible or rewards too weak)
- **Payer conversion** = payers / MAU (0.5–2% typical; the Starter Pack drives it)
- **D1/D7/D30 retention** — if D1 < 25%, stop monetization work and fix the early game instead
- **eCPM** by placement (rewarded web ≈ $5–15; mobile rewarded ≈ $10–40)

## Suggested order of execution

1. Phase 0 (analytics + privacy policy) — small effort
2. Shop/Boost tab UI over the existing `grantBoost`/`timeSkip` + fake "ad" that just waits 5s in dev — small
3. Apply to CrazyGames/Poki with the polished game; integrate their SDK if accepted — medium, brings players *and* revenue
4. H5 Games Ads on your own domain + consent — medium
5. Reassess with data → Founder Edition + Starter Pack via Lemon Squeezy/Paddle — medium
6. Capacitor + AdMob + RevenueCat once web numbers justify it — large

Each step is a good agent task; see `docs/agent-instructions.md` for prompt patterns. Keep every monetization callback funneling through `grantBoost`/`timeSkip`/entitlement flags so `src/game/` never depends on any SDK.
