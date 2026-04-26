# The Wanderer's Digital Escape

> *"What lies beyond the horizon of your mundane life?"*

A narrative browser-based game about digital wellbeing. No app store. No sign-up. Just a story about your attention, told through choices that actually matter.

---

## What Is This?

The Wanderer's Digital Escape is an **interactive wellbeing experience** disguised as a game. You play as a wanderer lost in the digital world — navigating four dangerous worlds that mirror how social media reshapes the mind, one choice at a time.

Every decision you make shifts four meters that measure the health of your inner life. Reach the beach at the end, and you receive a personalised **Digital Flourishing Score** with an action plan built around your choices.

Designed to take **~15 minutes**. No account required. Runs entirely in the browser.

---

## The Four Worlds

| # | World | Theme | What It Mirrors |
|---|-------|-------|-----------------|
| 01 | **Echo Chamber Swamp** | Fog, dripping trees, familiar paths | Algorithm bubbles, confirmation bias, endless scrolling |
| 02 | **Dopamine Arcade** | Neon lights, noise, slot-machine loops | Reel addiction, sleep deprivation, AI slop, notification cycles |
| 03 | **Validation City** | Towers built on likes, comparison mirrors | Follower counts, Instagram anxiety, social media deletion |
| 04 | **Nomad's Trail** | Wind, birdsong, open horizon | Reclaiming focus, real-world connection, intentional living |

Each world ends with a **Boss Encounter** — a personalised confrontation with the specific trap that world represents.

---

## The Four Meters

Every choice you make shifts one or more of these four dimensions. They start partially depleted — because that is where most of us begin.

| Meter | Color | What It Measures |
|-------|-------|-----------------|
| **Focus** | Cyan | Your capacity for deep, sustained thought |
| **Dopamine** | Amber | Your brain's reward signal — high is dangerous |
| **Oneness** | Violet | Your real-world connections and presence |
| **Tranquility** | Green | Inner stillness beyond the noise |

> **Ghost Mode:** If your Dopamine exceeds 75, the game enters Ghost Mode — a visual distortion layer representing what it feels like to be permanently elsewhere.

---

## Features

### Narrative & Gameplay

- **Typewriter narration** — Scene text animates character by character, making the story feel alive rather than static
- **Branching choices** — Every scene has 2–3 choices; each one measurably shifts your meters
- **Four boss encounters** — One per world: the Algorithm Mirror, the Dopamine Loop, the Validation Trap, and the Distraction Current
- **Special interactive moments:**
  - **60-Second Silence Timer** — A real countdown you sit through (or skip) during the meditation scene
  - **Instagram Deletion Flow** — A multi-step confirmation that mirrors the real in-app experience, with dissolving animation
  - **Frog Zoom-Out** — An animated metaphor: see the frog in the well, then zoom out to the full world
  - **Algorithm Profile Reveal** — Your data visualised as a bar chart: outrage 34%, actual learning 7%
  - **Dunbar's Number Moment** — Robin Dunbar's research on the 150-person limit, rendered as an interactive quote
- **Inventory system** — Collect up to 6 items throughout the journey (📚 Long-form Mind, 📔 Inner Voice, 🧘 Still Point, 🧭 True North, ☕ 5:30am Hour, 👟 The Run)
- **World Intro Cards** — A full-screen cinematic title card animates at the start of each world
- **Curiosity XP** — Earn +10 XP each time you choose a reading, podcast, journal, or long-form option

### HUD & Progress Tracking

- **Live meter bars** — Four color-coded progress bars update in real time with smooth transitions
- **Floating delta toasts** — When meters change, `+20 Focus` / `-10 Dopamine` floats up near the HUD so you never miss a consequence
- **World progress bar** — A thin amber line under the meters fills as you advance through worlds
- **Inventory tray** — Earned items appear as emoji icons with tooltip descriptions
- **Item toast** — A pill notification slides up when you collect a new item

### Audio

Six procedurally generated ambient soundscapes using the Web Audio API — no audio files, all synthesised in the browser:

| World | Soundscape |
|-------|-----------|
| Intro | Room hum, sub drone, breathing LFO, ticking clock |
| Echo Chamber Swamp | Forest bed, water drips, distant notification pings |
| Dopamine Arcade | Neon buzz, crowd murmur, coin blips, ascending score arpeggios |
| Validation City | Traffic rumble, AC hum, rain on glass, distant sirens |
| Nomad's Trail | Wind layers, melodic bird calls, soft footsteps |
| Beach (Win) | Dual wave layers, ocean shimmer, seagull glides |

- Audio **auto-starts on first user interaction** (respects browser autoplay policy)
- **Mute/unmute** toggle in the HUD at any time
- Smooth **crossfade** between soundscapes on world transition

### Accessibility & UX

- **Keyboard shortcuts** — Press `1`, `2`, or `3` to select choices without touching the mouse. Badge labels `[1]` `[2]` `[3]` shown on each button
- **Listen button** — Text-to-speech reads the full scene narrative using the Web Speech API
- **Dark / Light mode** — Toggle with ☀️/🌙 on the homepage or in the HUD. Preference persists across sessions
- **Scene transition fades** — 550ms opacity transition between scenes prevents jarring snaps
- **Responsive layout** — Works on mobile, tablet, and desktop

### Persistence & Settings

- **Auto-save** — Progress (scene, meters, inventory, seen worlds) is saved to `localStorage` after every choice
- **Continue Journey** — The homepage detects an existing save and offers to resume
- **Confirmed Reset** — The Reset button requires a second click within 3 seconds to avoid accidental progress loss
- **Settings modal** — ⚙️ gear icon opens a settings panel for storing a Gemini API key (for future AI image/TTS enhancements)

### Win Screen & Flourishing Score

When you reach the beach, you receive a full results breakdown:

**Flourishing Score (0–100)** calculated from:
```
Score = (Focus + Oneness + Tranquility + (100 - Dopamine)) / 4
```

**NIRMAN Framework — 8 Dimensions:**
- Physical Health
- Psychological Wellbeing
- Focus & Attention
- Social Connection
- Inner Tranquility
- Dopamine Freedom
- Intentionality
- Digital Flourishing

**Personalised Action Plan** — 4 specific tips generated from your final meter values (e.g. if Focus < 55, you receive a 30-minutes-of-reels-to-podcasts challenge).

**Download options:**
- 📥 **Score Card** — Canvas-generated PNG with your score, dimension bars, and collected items
- 📄 **Detailed Report** — Full HTML document (printable as PDF) with meter interpretations, inventory, and action plan

**Share your score:**
- 𝕏 Twitter / X
- 💬 WhatsApp
- in LinkedIn
- 🔗 Copy link

---

## How to Play

### Starting

1. Open `index.html` in a browser (or visit the hosted URL)
2. Click **Begin Journey →** to start fresh
3. If you have a saved session, **Continue Journey** will resume where you left off

### Making Choices

- Click any choice button, **or** press the keyboard shortcut shown in `[brackets]`
- Watch the floating delta toasts to understand how each choice affected your meters
- Check the progress bar under the HUD to see how far through the journey you are

### Navigation (Dev / Exploration)

The nav bar at the bottom provides extra controls:

| Button | Action |
|--------|--------|
| `⏮ World` | Jump to the previous world's start |
| `← Scene` | Go back one scene (unlimited undo) |
| `Skip` | Auto-advance with the first choice, no effects |
| `Scene →` | Auto-advance with the last choice, no effects |
| `World ⏭` | Jump to the next world's start |
| `Reset` | Clear all progress (double-click confirmation) |
| `Finish` | Skip to the win screen |

### Tips

- Choose long-form options (read, podcast, journal) to earn **Curiosity XP** and collect items
- Sit through the **60-Second Silence** in World 2 for the full cushion bonus
- Let the **Ghost Mode** distortion wash over you if your dopamine gets high — it's intentional
- Download the **Detailed Report** at the end and share it with someone you care about

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (CDN, no build step) |
| JSX Transform | Babel Standalone |
| Styling | Pure CSS (no framework) |
| Audio | Web Audio API (procedural synthesis) |
| Speech | Web Speech API |
| Canvas | HTML5 Canvas (score card export) |
| Storage | localStorage |
| Fonts | Crimson Pro · Space Mono (Google Fonts) |

Zero dependencies installed. No Node.js required to run. Open `index.html` directly, or serve with any static HTTP server:

```bash
python -m http.server 8080 --directory /path/to/digital-wellbeing
```

---

## File Structure

```
digital-wellbeing/
├── index.html          # App shell + all CSS
├── Game.jsx            # All React components (Home, HUD, SceneView, WinScreen, App)
├── game-scenes.js      # Full narrative scene graph (~40 scenes)
├── AudioEngine.js      # Procedural Web Audio soundscapes
├── Illustrations.jsx   # SVG illustrations per world
└── README.md           # This file
```

---

## About the Creator

**Sanket Tambare** — Software Developer · Full-Stack

A developer drawn equally to technology, psychology, society, and design. This project sits at the intersection of all of them: a piece of software that asks a human question.

- 🌿 [Linktree](https://linktr.ee/daredavil)
- in [LinkedIn](https://www.linkedin.com/in/sankettambare/)
- ✦ [Substack](https://sankettambare.substack.com/)
- ✉ sanket.tambare01@gmail.com
