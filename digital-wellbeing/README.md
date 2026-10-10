# The Wanderer's Digital Escape

> *"What lies beyond the horizon of your mundane life?"*

A one-night story about attention. It is 22:47 and your phone is still glowing. Walk out of the feed — through four worlds built from it — and reach a quiet beach by sunrise. Every choice changes the light you carry.

No app store. No sign-up. About twelve minutes, entirely in the browser.

---

## The experience

- **One continuous night.** A hand-drawn-feeling canvas landscape walks with you from 22:47 to 06:41. The sky is driven by the clock in the corner — midnight blue, the 2am arcade haze, the blue hour, the first light on the trail, sunrise on the beach — so the night itself is the progress bar.
- **A wanderer with a lantern.** A small figure walks east across parallax worlds. The lantern's size and colour are your four meters; it flares when you choose presence and flickers when Dopamine runs high.
- **Choices you can feel before you make them.** Point at a choice and the world leans toward it — warm light for presence, a cold screen-glow for the pull.
- **Acts, not just answers.** Inspired by games like *Florence*, where the gesture is the meaning:

| Scene | What you do |
|---|---|
| Prologue | **Hold** to set the phone face down while notifications keep stacking up |
| A clip or a conversation | Two waveforms — fifteen seconds of jitter or ninety minutes of calm |
| The Algorithm Mirror | **Hold** to crack your own reflection until it shatters |
| The reels | A phone that never stops scrolling. Swipe it — the "remembered" counter stays at 0 |
| The candle room | A real **60-second silence**, breathing in for four and out for six. Move, and the flame wavers |
| Notification settings | Real switches. Turn them off one by one and the pinging stops |
| The Streak Counter | **Hold** to break day 847 |
| Your five | Dunbar's circles — **type the names** of your five people |
| The account deletion screen | **Hold** for two seconds; the posts dissolve and the counters fall to zero |
| The notebook | **Write a line** in a paper notebook, in handwriting |
| The frog in the well | **Drag up** to widen the circle of sky until you see the whole world |
| The Last Notification | Tap it — or **observe it, untouched**, until it passes. That is the whole skill |

Every gesture also works from the buttons and the keyboard.

## The four worlds

| # | World | Time | What it mirrors |
|---|---|---|---|
| I | **Echo Chamber Swamp** | 23:05 | Algorithm bubbles, confirmation bias, endless scrolling |
| II | **The Dopamine Arcade** | 00:48 | Reels, AI slop, sleep loss, notifications, streaks |
| III | **Validation City** | 03:30 | Likes, comparison, Dunbar's five, deleting the account |
| IV | **The Nomad's Trail** | 05:16 | The 5:30am hour, the run, the notebook, the well |

Each world opens with a title card and ends with a boss: the Algorithm Mirror, the Streak Counter, the Mirror Wall and the Last Notification.

## The four meters

| Meter | Starts at | Measures |
|---|---|---|
| **Focus** | 30 | Your capacity for deep, sustained thought |
| **Dopamine** | 40 | The reward signal of the scroll — this one works in reverse |
| **Oneness** | 25 | Your real-world connections and presence |
| **Tranquility** | 20 | Inner stillness beyond the noise |

Above 75 Dopamine the game enters **Ghost Mode**: the world drains of colour and glitches at the edges.

The four-petal gauge in the corner opens your **inner light** panel — the meters, where you started, and your satchel of six collectible items (Long-form Mind, Inner Voice, Still Point, True North, 5:30am Hour, The Run).

## The beach

The ending is a sunrise, then a scroll through where you arrived:

- **Digital Flourishing Score** — `(Focus + Oneness + Tranquility + (100 − Dopamine)) ÷ 4`
- **Your archetype** — the nearest of five wanderers (the Mindless Scroller → the Digital Ascetic)
- **The light you carried** — each meter from where it started to where it ended
- **Eight dimensions** (the NIRMAN framework) as an interactive radar
- **The path you walked** — every choice as a light (toward presence) or a hollow (toward the pull)
- **What you carried** and **what you wrote down** — your five and your line from the notebook
- **An action plan** you can commit to, tip by tip
- **A score card** (1080×1350 PNG), a **printable full report**, and share links

Names and notebook lines stay in your browser's local storage and appear only on your own results; nothing is sent anywhere.

## Sound

Every sound is synthesised with the Web Audio API — no audio files. Each world has a slow musical pad plus its own texture (drips and distant pings in the swamp, a restless arpeggio in the arcade, rain and sirens in the city, wind and birds on the trail, waves and gulls at the beach), crossfading as you walk. Interactions have their own sounds: a bell for presence, a blip for the pull, a phone buzz, a tone that climbs while you hold a choice, the shatter of a mirror. Sound starts on your first click (browser autoplay rules) and can be muted from the title, the HUD or with `M`.

## Controls

| Key | Action |
|---|---|
| `1` `2` `3` | Choose (hold the key for a hold-choice) |
| `Space` / `Enter` | Show the rest of the text |
| `I` | Your inner light (meters + satchel) |
| `M` | Sound on / off |
| `Esc` | Menu: text pace, read-aloud, chapters, step back, start over |

**Listen** reads any scene aloud (Web Speech API). Progress saves after every choice; the title offers to continue. `prefers-reduced-motion` is respected throughout.

## How it's built

| Layer | Technology |
|---|---|
| UI | React 18 (production UMD from unpkg) + [htm](https://github.com/developit/htm) tagged templates — no build step, no Babel |
| World | One 2D `<canvas>`: procedural parallax layers, a clock-driven sky, a walking figure (`world.js`) |
| Audio | Web Audio API synthesis with a generated reverb (`AudioEngine.js`) |
| Type | Instrument Serif · Newsreader · IBM Plex Mono · Caveat (Google Fonts) |
| Storage | `localStorage` (`wde.v2`, `wde.prefs`) |

```
digital-wellbeing/
├── index.html          # Shell, static title fallback, scripts
├── styles.css          # Every view and vignette
├── world.js            # The canvas night (World.set / walk / pulse)
├── AudioEngine.js      # Soundscapes and interaction sounds
├── game-scenes.js      # The story: worlds, items, ~27 scenes, archetypes
├── vignettes.js        # The interactive object of each scene
├── game.js             # The app: title, HUD, scenes, panels, ending, field notes
└── three-orb-prototype.html  # A separate Three.js experiment
```

Serve the repository root (`python3 -m http.server 3010`) and open `digital-wellbeing/index.html`. `#how-it-works` opens the field notes; `?scene=w2_reels` jumps straight to a scene for development (that session isn't saved).

---

## About the creator

**Sanket Tambare** — Software Developer · Full-Stack. A developer drawn equally to technology, psychology, society, and design; this project sits at the intersection of all of them.

- 🌿 [Linktree](https://linktr.ee/daredavil)
- in [LinkedIn](https://www.linkedin.com/in/sankettambare/)
- ✦ [Substack — Digital Wellbeing](https://sankettambare.substack.com/t/digital-wellbeing)
- ✉ sanket.tambare01@gmail.com
