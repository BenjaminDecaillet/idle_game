---
name: audio-chiptune
description: The Web Audio music/chime engine in src/ui/fx.ts - chiptune loop conventions, scheduler, ducking, settings plumbing. Use when changing music, adding chimes/SFX, or touching audio settings.
---

# Audio in Idle Silicon Valley

Everything is synthesized in `src/ui/fx.ts` — no binary assets, no
licensing. One lazily created `AudioContext` is shared by SFX, chimes and
music; `ensureAudio()` resumes it (autoplay policy: only audible after a
user gesture — every dispatch click qualifies).

## Music ("Garage Dreams")

- Patterns at the top of fx.ts: `MUSIC_LEAD`/`MUSIC_BASS`/`MUSIC_BLIP`,
  MIDI numbers (null = rest), 32 8th-note steps = 4 bars of C–G–Am–F at
  `MUSIC_BPM` 132. Square lead, triangle bass, quiet offbeat blips.
- `scheduleMusic()` is a lookahead scheduler driven from `update(dt)` (60
  fps): it keeps `MUSIC_LOOKAHEAD_SEC` of notes queued with
  sample-accurate WebAudio timestamps and jumps the playhead after a
  background-tab pause instead of cramming missed steps.
- All notes route through `musicGain` (level = `musicVolume ×
  MUSIC_BUS_LEVEL`), so volume changes and ducking are one gain node.
  `duckMusic()` dips the bus under any chime and recovers.
- `setMusic(on)` / `setMusicVolume(v)` are the only entry points; call
  them from gesture handlers (ui.ts `toggle-music`, `music-volume`
  data-select) and on state load (main.ts, `replaceState`) — arming
  before a gesture is fine, the scheduler waits for `state === 'running'`.

## Chimes

`storyChime()` (angelic sine arpeggio, Gabriel modals), `claimChime()`
(triangle fanfare, mission claims), `coinChime()` (sparkle blips, VsCoin
pack claims), plus the legacy `ding()` (payouts) and `click()`. All guard
on `soundEnabled` and duck the music. New chimes: use `tone(freqs, gain,
duration, type, stagger)` and keep gains ≤ 0.08.

## Settings

`settings.music` (default OFF) and `settings.musicVolume` (0..1, default
0.5) — additive fields, hygiene-clamped in `migrate()` (save.ts), no
SAVE_VERSION bump. Sound effects (`settings.sound`) stay independent of
music.
