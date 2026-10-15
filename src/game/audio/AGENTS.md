# Audio

Audio is self-contained: application code calls `AudioEngine`, and no source in
this subsystem imports the rest of the app. Event names cross the boundary as
strings. Keep gameplay/rendering dependencies out of audio helpers and scores.

## Sound map

| Files                                        | Role                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `audio.ts`                                   | Engine facade, menu/game mode, wave changes, pause, mute, effects |
| `audio-graph.ts`, `audio-synth.ts`           | Web Audio routing, voices, scheduling and cleanup                 |
| `audio-transport.ts`, `audio-arrangement.ts` | Music position, transitions, arrangement and crossfades           |
| `music.ts`, `audio-config.ts`                | Typed access to authored music and settings                       |
| `effects/`                                   | Event dispatch, effect-score playback, bundled boss voice         |
| `scores/`                                    | JSON music tracks, arrangement, effect scores and mix settings    |

The prelude's **Click to play** gesture unlocks audio before the opening menu
appears. Preserve immediate menu music after that gesture and the transition into
gameplay. Maintain varied melodic arrangements and overlapping track crossfades;
avoid adding a persistent monotonous background beat.

Keep transport scheduling idempotent: repeated start/resume calls must not stack
music schedulers. Pause and mute stop scheduled sound and preserve the intended
transport position; restarting a run resets it. Route effect volume and limiting
through the existing graph and event intervals.

Audio assets, including `public/assets/audio/boss-fight.wav`, are local. Preserve
the one-second boss headline's separate UI timing when editing its sound cue.
Use `music.test.ts` for score/arrangement changes and `tests/audio/` for browser
unlock, transitions, pause/mute, and bundled voice behavior. Listen to audible
changes as well as checking transport state.
