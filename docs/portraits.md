# Character portraits — asset drop-in guide

Characters (player avatar, employees, Gabriel) render as **painted,
semi-realistic portrait cards** ("Idle Angels" direction) — a deliberate
contrast with the cartoon UI, which stays unchanged. The pipeline is hybrid
(`src/ui/portraits.ts`):

1. If a raster portrait file exists in `public/portraits/`, it is shown.
2. If not, an upgraded **painted SVG placeholder** renders instead
   (`src/ui/portraitArt.ts` for humans, `src/ui/gabrielPortrait.ts` for
   Gabriel). The game is fully playable with zero image files.

Dropping files in requires **zero code changes**: at startup the game probes
which files exist and uses them on the next redraw. Files added to the repo
are picked up by the normal GitHub Pages build (and precached by the PWA
service worker).

## File spec (all images)

| Property | Value |
|---|---|
| Location | `public/portraits/` |
| Format | **WebP** preferred; `.png` also works (probed as fallback) |
| Size | **512 × 512 px**, square |
| Background | Opaque painted backdrop (dark/vignetted looks best — the UI rounds the corners and frames it). Transparency is supported but not needed. |
| Framing | Bust portrait: head + shoulders, face centered, eyes in the upper third. Leave a small margin — corners are rounded by CSS. |
| Naming | Exactly as listed below, lowercase, zero-padded two-digit numbers |

Style for every image: painted semi-realistic mobile-game portrait
(detailed skin/hair/lighting, soft rim light, glossy card feel). Keep one
consistent style across all files — generate them in one batch/session with
the same style prompt if possible.

## The 44 files

### Employees — `employee-01.webp` … `employee-24.webp` (24 files)

Each hired worker (and hire candidate) is deterministically assigned one of
these 24 portraits from the existing persona hash — the same worker always
gets the same portrait, forever, across devices. The pool is global (not
per specialization — specialization stays visible via the card's colored
badge), so aim for **variety**: mix of genders, ages (intern-young to
grey-haired veteran), skin tones, hair styles/colors, glasses/no glasses,
casual tech-office clothing (t-shirts, hoodies, shirts). No text, no logos.

Suggested prompt skeleton:
> Painted semi-realistic bust portrait of a software developer, [woman/man],
> [age], [skin tone], [hair], [clothing], soft studio lighting, dark painted
> background, mobile game character card art, head and shoulders, no text.

### Player — `player-01.webp` … `player-16.webp` (16 files)

The player picks one directly in the avatar customizer ("Portrait" row;
option 0 keeps the drawn look built from the other customization fields).
These are the hero cards — make them the best of the set: founder/CEO
energy, confident poses, varied genders and skin tones so every player
finds a fit. Same style and framing as the employees, slightly more
dramatic lighting is welcome.

### Gabriel — 4 files

Gabriel is the game's angelic robot assistant: a cream/porcelain rounded
robot with a **glowing blue screen face**, expressive glowing eyes, a
**golden halo**, a small gold antenna bobble and a gold belly light. Same
character in all four images, different expression per pose:

| File | Expression |
|---|---|
| `gabriel-idle.webp` | warm friendly smile, relaxed |
| `gabriel-point.webp` | eager, excited, leaning slightly forward |
| `gabriel-cheer.webp` | ecstatic grin, star-struck sparkling eyes, radiant halo |
| `gabriel-think.webp` | pensive, eyes drifting up, moodier lighting |

If you only generate one image, name it `gabriel-idle.webp` — missing poses
automatically fall back to it (then to the painted SVG).

Suggested prompt skeleton:
> Painted semi-realistic portrait of a cute angelic robot assistant,
> rounded cream porcelain body, glowing blue screen face with expressive
> glowing eyes, golden halo, [expression], heavenly soft lighting, dark
> painted background, mobile game character card art, no text.

## Mapping reference (for maintainers)

- Employees: `portraitSlot(seed, 24)` in `src/ui/persona.ts` — FNV-1a hash,
  dedicated `>>> 16` shift. Never change existing shifts; changing the pool
  size also reshuffles portraits (only ever grow it if you must, and accept
  the reshuffle consciously).
- Player: `state.player.look.portrait` (save v7): 0 = drawn look,
  1..16 = `player-NN`.
- Gabriel: pose → `gabriel-<pose>` → `gabriel-idle` → SVG placeholder.
- Counts live in `EMPLOYEE_PORTRAIT_COUNT` (`src/ui/portraits.ts`) and
  `PLAYER_PORTRAIT_COUNT` (`src/game/data.ts`).
