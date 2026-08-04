import { EVENT_MIN_EARNED, RANDOM_EVENTS } from './data';
import { activeCountry, grantBoost, grossRewardRate, walletMoney } from './engine';
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
