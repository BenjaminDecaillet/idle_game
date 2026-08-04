import { describe, expect, it } from 'vitest';
import { MAP_THEMES, WALLPAPERS } from '../src/game/data';
import {
  activeCompany,
  activeCountry,
  buyCompany,
  buyMapTheme,
  buyWallpaper,
  createInitialState,
  effectiveWallpaper,
  setCompanyWallpaper,
  setDefaultWallpaper,
  setMapTheme,
  siteUnderConstruction,
  tick,
} from '../src/game/engine';
import { migrate } from '../src/game/save';

const NOW = 1_700_000_000_000;

/** Helper: after buyCompany, complete the build. */
function completeBuild(state: any, siteId: string): any {
  const country = activeCountry(state);
  const action = siteUnderConstruction(country, siteId);
  if (!action) return country.companies.find((c) => c.siteId === siteId);
  tick(state, action.remainingSec + 1);
  return country.companies.find((c) => c.siteId === siteId)!;
}

describe('wallpapers', () => {
  it('starts owning the free wallpaper, applied everywhere by default', () => {
    const state = createInitialState(NOW);
    expect(state.ownedWallpapers).toEqual(['concrete']);
    expect(state.defaultWallpaperId).toBe('concrete');
    expect(activeCompany(state).wallpaperId).toBeNull();
    expect(effectiveWallpaper(state, activeCompany(state))).toBe('concrete');
  });

  it('buyWallpaper checks money, deducts once, and unlocks globally', () => {
    const state = createInitialState(NOW);
    const def = WALLPAPERS.find((w) => w.cost > 0)!;
    activeCountry(state).money = def.cost - 1;
    expect(buyWallpaper(state, def.id)).toBe('error.notEnoughMoney');
    activeCountry(state).money = def.cost;
    expect(buyWallpaper(state, def.id)).toBeNull();
    expect(activeCountry(state).money).toBe(0);
    expect(state.ownedWallpapers).toContain(def.id);
    expect(buyWallpaper(state, def.id)).toBe('Already owned');
  });

  it('per-company apply and player default are independent', () => {
    const state = createInitialState(NOW);
    const def = WALLPAPERS.find((w) => w.cost > 0)!;
    activeCountry(state).money = def.cost + 200_000;
    expect(buyWallpaper(state, def.id)).toBeNull();

    // Apply to the first (active) company only.
    expect(setCompanyWallpaper(state, def.id)).toBeNull();
    expect(effectiveWallpaper(state, activeCountry(state).companies[0])).toBe(def.id);

    // A second company still follows the player default...
    expect(buyCompany(state, 'loft')).toBeNull();
    completeBuild(state, 'loft');
    const second = activeCountry(state).companies.find((c) => c.siteId === 'loft')!;
    expect(effectiveWallpaper(state, second)).toBe('concrete');

    // ...until the default itself changes.
    expect(setDefaultWallpaper(state, def.id)).toBeNull();
    expect(effectiveWallpaper(state, second)).toBe(def.id);

    // The loft company still has no explicit wallpaper, so it follows the default
    expect(second.wallpaperId).toBeNull();
  });

  it('cannot apply or default an unowned wallpaper', () => {
    const state = createInitialState(NOW);
    const def = WALLPAPERS.find((w) => w.cost > 0)!;
    expect(setCompanyWallpaper(state, def.id)).toBe('Wallpaper not owned');
    expect(setDefaultWallpaper(state, def.id)).toBe('Wallpaper not owned');
  });
});

describe('map themes', () => {
  it('buying a theme deducts money and selects it; switching needs ownership', () => {
    const state = createInitialState(NOW);
    expect(state.mapThemeId).toBe('daylight');
    const def = MAP_THEMES.find((t) => t.cost > 0)!;
    expect(setMapTheme(state, def.id)).toBe('Map theme not owned');
    activeCountry(state).money = def.cost;
    expect(buyMapTheme(state, def.id)).toBeNull();
    expect(activeCountry(state).money).toBe(0);
    expect(state.mapThemeId).toBe(def.id);
    expect(setMapTheme(state, 'daylight')).toBeNull();
    expect(state.mapThemeId).toBe('daylight');
  });
});

describe('cosmetics migration hygiene', () => {
  it('fills defaults for old saves and drops unknown ids', () => {
    const state = createInitialState(NOW);
    const parsed = JSON.parse(JSON.stringify(state)) as ReturnType<typeof createInitialState>;
    // Simulate a pre-cosmetics save plus some corrupt data.
    (parsed as Partial<typeof parsed>).ownedWallpapers = undefined;
    (parsed as Partial<typeof parsed>).defaultWallpaperId = undefined;
    (parsed as Partial<typeof parsed>).ownedMapThemes = undefined;
    (parsed as Partial<typeof parsed>).mapThemeId = undefined;
    activeCountry(parsed).companies[0].wallpaperId = 'no-such-wallpaper';

    const migrated = migrate(parsed, NOW);
    expect(migrated.ownedWallpapers).toContain('concrete');
    expect(migrated.defaultWallpaperId).toBe('concrete');
    expect(migrated.ownedMapThemes).toContain('daylight');
    expect(migrated.mapThemeId).toBe('daylight');
    expect(activeCountry(migrated).companies[0].wallpaperId).toBeNull();
  });

  it('keeps owned cosmetics across migration', () => {
    const state = createInitialState(NOW);
    const wp = WALLPAPERS.find((w) => w.cost > 0)!;
    activeCountry(state).money = wp.cost;
    buyWallpaper(state, wp.id);
    setCompanyWallpaper(state, wp.id);
    const migrated = migrate(JSON.parse(JSON.stringify(state)), NOW);
    expect(migrated.ownedWallpapers).toContain(wp.id);
    expect(activeCountry(migrated).companies[0].wallpaperId).toBe(wp.id);
  });
});
