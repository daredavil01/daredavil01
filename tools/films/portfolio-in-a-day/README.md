# Portfolio in a Day: "Before we begin" film

The source of the 98-second whiteboard film on slide 3 of
`presentations/stone-by-stone.html`. Authoring only; the deck plays the
committed MP4s in `presentations/assets/stone-by-stone/film/`.

- `script.json`: the narration, one entry per scene.
- `tts.py`: speaks each scene with Microsoft Edge's `en-IN-NeerjaExpressiveNeural`
  voice (`pip install edge-tts`) and records word timings into `vo/words.json`.
  Then run `python3 -c "import json;open('words.js','w').write('window.WORDS='+json.dumps(json.load(open('vo/words.json')))+';')"`.
- `film.html`: the whiteboard. `?l=h` (1920×1080) or `?l=v` (1080×1920);
  `render(t)` draws any moment. Every stroke is timed to a narrated word.
- `frames.js`: serve the repo root on port 3010, then `node frames.js h 4`
  (and `v`) writes `frames-<l>/*.jpg` at 30 fps plus `film-<l>.json`.
- `mix.py <l>`: voice + a synthesized tune ducked under it + marker
  scribbles on each stroke + whooshes on the pans → `mix-<l>.wav`.
- Encode: `ffmpeg -framerate 30 -i frames-h/%05d.jpg -i mix-h.wav -c:v libx264 -preset slow -crf 25 -tune animation -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart -shortest before-we-begin.mp4`.

`vo/`, `frames-*/`, `mix-*.wav` and `film-*.json` are build output; don't commit them.
