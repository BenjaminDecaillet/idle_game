# Idle Silicon Valley — design system (v1)

Direction artistique : **cartoon détaillé, lumineux et coloré** (esprit Two Point
Hospital). Tous les visuels sont des **SVG codés à la main**, inline dans le DOM.
Aucun PNG, aucune requête réseau, aucune dépendance.

## Palette

Jour lumineux par défaut. Les tokens vivent dans `:root` (`src/style.css`).

| Token | Valeur | Usage |
|---|---|---|
| `--sky-hi` | `#6ec6f5` | haut du ciel (fond de page) |
| `--sky-lo` | `#cdefff` | bas du ciel |
| `--surface` | `#fff8ec` | cartes, panneaux (crème chaud) |
| `--surface-2` | `#f6ecd9` | fonds secondaires, tuiles |
| `--ink` | `#2d2440` | contours, texte (prune-marine, jamais du noir pur) |
| `--ink-soft` | `rgba(45,36,64,.55)` | texte secondaire |
| `--primary` | `#ff8a2a` | CTA, boutons d'achat (orange soleil) |
| `--primary-deep` | `#e06a00` | rim/bord bas des boutons primaires |
| `--blue` | `#38b6ff` | accent secondaire, sélection |
| `--green` | `#2fbf6b` | argent, gains |
| `--red` | `#ff5d55` | erreurs, danger |
| `--gold` | `#ffc93c` | niveaux, XP, premium |

Spécialisations (inchangées en teinte, saturées) : Frontend `#ff6fa9`,
Backend `#4f8df9`, DevOps `#2fbf7f`, Data Science `#ffb02e`.

## Règles SVG (obligatoires pour tout asset)

- **Contours** : `stroke` ink `#2d2440`, `stroke-linejoin="round"`,
  `stroke-linecap="round"`. Épaisseur ≈ 1.5–2 unités pour un viewBox de 24,
  proportionnel sinon. Les contours font le style cartoon — ne pas les omettre.
- **Ombrage cel** : chaque forme a 1 teinte de base + 1 face sombre (côté droit
  ou bas, −15 % de luminosité) + 1 rehaut clair optionnel. Dégradés
  `linearGradient` autorisés, subtils.
- **Ombre portée** : ellipse sous l'objet, `fill="#2d2440"` `opacity=".12"`.
- **Pas de filtres SVG** (`feGaussianBlur`…) dans les grandes scènes — trop cher
  sur mobile. Éviter aussi dans les icônes.
- **IDs uniques** : tout `<linearGradient id>` doit être préfixé par le nom de
  l'asset (`lg-tower-…`) — les SVG sont inline et partagent le DOM.
- **Détails** : fenêtres, plantes, câbles, tasses… la personnalité vient des
  petits détails. Viser « dense mais lisible à 100 px de large ».
- Réutiliser les couleurs de palette quand ça a du sens (ink pour tous les
  contours), mais les scènes peuvent avoir leurs propres couleurs locales.

## Composants

- **Cartes** : fond `--surface`, `border: 2px solid --ink` (opacité .9),
  `border-radius: 16px`, ombre dure `0 4px 0 rgba(45,36,64,.18)`.
- **Boutons** : chunky, radius 12px, bord ink 2px, **rim 3D** en bas
  (`box-shadow: 0 3px 0 <teinte-deep>`), press = `translateY(3px)` + rim à 0.
  Primaire orange, secondaire crème, danger rouge, ghost transparent.
- **Bottom sheet** : panneau `--surface` ancré en bas, radius 20px en haut,
  poignée, animation slide-up 0.22s.
- **Typo** : « Baloo 2 » (variable 400–800, woff2 embarqué) partout.
  Titres/HUD/prix : 700–800. Corps : 500. Chiffres : `tabular-nums`.

## Fichiers

- `src/style.css` — tokens + tout le styling.
- `src/ui/icons.ts` — icônes UI (onglets, HUD, badges).
- `src/ui/cityMap.ts` — scène carte de la ville (chantier 1).
- `src/ui/officeScene.ts` — décors wallpaper du bureau (chantier 2).
- `src/ui/itemArt.ts` — illustrations des objets/upgrades/projets (chantier 3).
- Les grosses scènes statiques sont **mémoïsées** (clé = inputs visuels) — le
  re-render 2 Hz ne doit jamais reconstruire une scène inchangée.
