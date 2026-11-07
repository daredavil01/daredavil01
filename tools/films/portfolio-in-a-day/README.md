# Portfolio in a Day: "Before we begin" film

The source of the 99-second whiteboard film on slide 3 of
`presentations/stone-by-stone.html`, built with [Remotion](https://www.remotion.dev).
Authoring only: the deck plays the committed MP4s in
`presentations/assets/stone-by-stone/film/`.

- `src/timeline.jsx`: the film as data. Every pen stroke, group and effect is
  timed to a narrated word (`src/words.json`). Pen strokes are sequenced so one
  marker is only ever in one place. Effects use Remotion's `spring()`, `random()` and
  `@remotion/paths`: spring pops, hops with squash and stretch, falling words,
  confetti, twinkles, pulse rings, photos dropping in on springs, a stamp
  that shakes the board, a spinning globe, growing bars and a banking paper plane.
- `src/Film.jsx`: draws it. Spring camera pans with tilt and a slow push-in,
  a parallax layer of doodles (`@remotion/noise`), paper grain, the marker
  pen, the end card. Two compositions: `Film-h` (1920×1080) and `Film-v` (1080×1920).
- `script.json` + `tts.py`: the narration, spoken by Edge's
  `en-IN-NeerjaExpressiveNeural` (`pip install edge-tts`), with word timings
  into `vo/words.json` (copy it to `src/words.json`).
- `events.jsx` → `film-<l>.json`: strokes and effect cues for the sound.
  `mix.py <l>` mixes voice, a synthesized tune ducked under it, marker
  scribbles, pops, sparkles and whooshes into `public/mix-<l>.wav`.

```sh
npm install
npx esbuild events.jsx --bundle --platform=node --format=cjs --jsx=automatic --loader:.jsx=jsx --outfile=events.cjs && node events.cjs
python3 mix.py h && python3 mix.py v && mv mix-*.wav public/
mkdir -p public/shots && cp ../../../presentations/assets/stone-by-stone/{site-home,card-desk,vtbm-desk,runfolio-desk,psp-desk,theme-*}.webp public/shots/
npx remotion render src/index.js Film-h out/h.mp4 --codec=h264 --crf=24 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
# then a lighter web encode: ffmpeg -i out/h.mp4 -c:v libx264 -preset slow -crf 27 -tune animation -pix_fmt yuv420p -c:a copy -movflags +faststart before-we-begin.mp4
```
`npx remotion studio src/index.js` previews it with a scrubber.
