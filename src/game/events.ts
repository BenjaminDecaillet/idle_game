import {
  EVENT_MIN_EARNED,
  RANDOM_EVENTS,
  VIRAL_JACKPOT_CHANCE,
  VIRAL_JACKPOT_DAILY_CAP,
  VIRAL_JACKPOT_VSCOIN,
  VIRAL_MIN_EARNED,
  VIRAL_REWARD_FLOOR,
  VIRAL_REWARD_MINUTES,
} from './data';
import {
  activeCountry,
  grantBoost,
  grantVsCoin,
  grossRewardRate,
  walletMoney,
} from './engine';
import type { GameState } from './types';

/**
 * Random events: small decision moments ("an investor offers $X for 2×
 * salaries — accept?"). The UI layer schedules WHEN an offer appears
 * (wall-clock, briefcase pattern — never offline); this module computes the
 * offer deterministically from state + an injectable rand and resolves the
 * choice through engine actions only.
 */

export interface EventOffer {
  id: string;
  emoji: string;
  /** Signed cash on accept: positive = granted, negative = charged upfront. */
  cash: number;
  mult: number;
  salaryMult: number;
  durationSec: number;
}

/** Events unlock after the tutorial, once there is an economy to trade with. */
export function eventsUnlocked(state: GameState): boolean {
  return state.tutorial.done && state.totalEarned >= EVENT_MIN_EARNED;
}

/** Roll an offer (weighted pick + income-scaled cash), or null when locked. */
export function rollEventOffer(
  state: GameState,
  rand: () => number = Math.random,
): EventOffer | null {
  if (!eventsUnlocked(state)) return null;
  const total = RANDOM_EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let r = rand() * total;
  let def = RANDOM_EVENTS[RANDOM_EVENTS.length - 1];
  for (const e of RANDOM_EVENTS) {
    r -= e.weight;
    if (r <= 0) {
      def = e;
      break;
    }
  }
  const scaled = Math.round(Math.abs(def.cashMinutes) * 60 * grossRewardRate(state));
  const cash = Math.sign(def.cashMinutes) * Math.max(def.cashFloor, scaled);
  return {
    id: def.id,
    emoji: def.emoji,
    cash,
    mult: def.mult,
    salaryMult: def.salaryMult,
    durationSec: def.durationSec,
  };
}

// ---------------------------------------------------------------------------
// Viral moments (docs/balance.md Phase B) — presence-gated bonus clickables.
// The UI schedules WHEN a bubble appears (wall-clock, briefcase pattern,
// never offline); this resolves a catch deterministically from state + rand.
// ---------------------------------------------------------------------------

/** Viral bubbles spawn once there's an audience worth going viral for. */
export function viralUnlocked(state: GameState): boolean {
  return state.tutorial.done && state.totalEarned >= VIRAL_MIN_EARNED;
}

/**
 * Resolve a caught viral moment: income-scaled cash into the active wallet
 * (deliberately NOT totalEarned — missions must not feed on presence
 * bonuses, matching event cash), a durable catch counter, and a small
 * VsCoin jackpot capped per UTC day (`day` comes from the UI layer).
 */
export function catchViral(
  state: GameState,
  day: number,
  rand: () => number = Math.random,
): { cash: number; jackpot: boolean } {
  const cash = Math.max(
    VIRAL_REWARD_FLOOR,
    Math.round(grossRewardRate(state) * 60 * VIRAL_REWARD_MINUTES),
  );
  activeCountry(state).money += cash;
  state.viral.catches += 1;
  if (state.viral.jackpotDay !== day) {
    state.viral.jackpotDay = day;
    state.viral.jackpotsToday = 0;
  }
  let jackpot = false;
  if (state.viral.jackpotsToday < VIRAL_JACKPOT_DAILY_CAP && rand() < VIRAL_JACKPOT_CHANCE) {
    state.viral.jackpotsToday += 1;
    grantVsCoin(state, VIRAL_JACKPOT_VSCOIN, 'viral:jackpot');
    jackpot = true;
  }
  return { cash, jackpot };
}

/** Accept an offer: charge/grant the cash and start the timed modifier. */
export function acceptEventOffer(state: GameState, offer: EventOffer): string | null {
  if (
    !Number.isFinite(offer.cash) ||
    !Number.isFinite(offer.mult) ||
    !Number.isFinite(offer.salaryMult) ||
    offer.durationSec <= 0
  ) {
    return 'error.invalidBoost';
  }
  if (offer.cash < 0 && walletMoney(state) < -offer.cash) return 'error.notEnoughMoney';
  if (offer.mult > 1 || offer.salaryMult > 1) {
    const err = grantBoost(
      state,
      offer.mult,
      offer.durationSec,
      `event:${offer.id}`,
      offer.salaryMult > 1 ? offer.salaryMult : undefined,
    );
    if (err) return err;
  }
  activeCountry(state).money += offer.cash;
  return null;
}
