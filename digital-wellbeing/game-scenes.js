// game-scenes.js — the story of The Wanderer's Digital Escape.
//
// One night, 22:47 → sunrise. Four worlds built from the feed, then the beach.
// Each scene is a few short beats of narration, an optional "vignette" (the
// small interactive object the scene is about), and two or three choices.
//
//   beats      paragraphs, revealed one after another
//   time       the clock in the corner (minutes after 22:00 drive the sky)
//   step       position on the journey, for the progress line
//   vignette   which interactive object to show (see game.js → VIGNETTES)
//   choices    text, next scene, meter effects, and optionally:
//                hold    the choice must be held (a deliberate act)
//                awards  an item for the satchel
//                play    the vignette plays this before moving on
//                special 'timer60' opens the candle room
window.WDE = (function () {
  const WORLDS = [
    { n: 0, biome: 'intro', roman: '', short: 'Prologue', name: 'The Room', accent: '#b9a6ff' },
    { n: 1, biome: 'swamp', roman: 'I', short: 'Echo Chamber', name: 'Echo Chamber Swamp', accent: '#9be7b4',
      desc: 'You only see what confirms what you already think.' },
    { n: 2, biome: 'arcade', roman: 'II', short: 'Dopamine Arcade', name: 'The Dopamine Arcade', accent: '#ff8ad8',
      desc: 'Everything is exciting. Nothing is remembered.' },
    { n: 3, biome: 'city', roman: 'III', short: 'Validation City', name: 'Validation City', accent: '#a8c8ff',
      desc: 'Everyone is watching. No one is connecting.' },
    { n: 4, biome: 'trail', roman: 'IV', short: "Nomad's Trail", name: "The Nomad's Trail", accent: '#ffc890',
      desc: 'The world is still here. You just forgot to look.' },
    { n: 5, biome: 'beach', roman: '', short: 'The Beach', name: 'The Beach', accent: '#ffe0a8' },
  ];

  const ITEMS = {
    book:    { name: 'Long-form Mind', desc: 'You chose depth over speed.',
               path: 'M12 6.5C9.6 4.9 6.4 4.5 3.5 5.2v13.3c2.9-.7 6.1-.3 8.5 1.3M12 6.5c2.4-1.6 5.6-2 8.5-1.3v13.3c-2.9-.7-6.1-.3-8.5 1.3M12 6.5v13.3' },
    journal: { name: 'Inner Voice', desc: 'You sat with your own thoughts.',
               path: 'M6.5 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5zM9.5 3.5v17M12.5 8.5h3.5M12.5 11.5h3.5M4.5 7h2M4.5 11h2M4.5 15h2' },
    cushion: { name: 'Still Point', desc: '60 seconds of real presence.',
               path: 'M12 19.5c-1.8-2.6-1.8-6.4 0-9 1.8 2.6 1.8 6.4 0 9zM12 19.5c-3.4.2-6.6-1.4-8-4 3-.6 6 .8 8 4zM12 19.5c3.4.2 6.6-1.4 8-4-3-.6-6 .8-8 4zM12 4.5v2M7.5 6l1 1.6M16.5 6l-1 1.6' },
    compass: { name: 'True North', desc: "The lighthouse keeper's gift.",
               path: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.2 8.8l-1.9 4.5-4.5 1.9 1.9-4.5zM12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8' },
    coffee:  { name: '5:30am Hour', desc: 'The morning before the world.',
               path: 'M5 10h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5zM16 11h1.3a2.3 2.3 0 0 1 0 4.6H16M8.5 3.8c-.9.9.9 1.8 0 2.8M11.5 3.8c-.9.9.9 1.8 0 2.8M4 21h13' },
    shoes:   { name: 'The Run', desc: 'An hour without the phone.',
               path: 'M3 17.5l.9-7c1.9.4 3.3.9 5.1.6l1.6-2.6c2.4 2.4 5.4 4.2 9.3 5.1.8.2 1.1.8 1.1 1.6v2.3zM3 20h18M8 12.3l1.2 1.4M10.5 11l1.2 1.4' },
  };

  const SCENES = {
    // ── PROLOGUE ───────────────────────────────────────────────────────────────
    intro: {
      world: 0, time: '22:47', step: 0, vignette: 'phone',
      beats: [
        'Your phone glows on the nightstand.',
        "47 notifications. 7 hours of screen time, and the day isn't over.",
        'Somewhere far beyond the feeds, past the reels, past the endless recommended content — there is a beach. Still. Quiet. Real.',
        '“You are forever elsewhere. Tonight, you choose to come back.”',
      ],
      choices: [
        { text: 'Check notifications first…', next: 'w1_enter', effects: { dopamine: 15, focus: -10, oneness: -5 } },
        { text: 'Set the phone face down. Begin.', next: 'w1_enter', hold: true, effects: { focus: 15, tranquility: 10, oneness: 5 } },
      ],
    },

    // ── WORLD 1 — ECHO CHAMBER SWAMP ───────────────────────────────────────────
    w1_enter: {
      world: 1, time: '23:05', step: 1, worldIntro: true,
      beats: [
        'The fog settles around your ankles. Every tree looks familiar — because they are all your own thoughts, reflected back.',
        'The Algorithm has mapped your mind with perfect precision. It knows what you will click before you do.',
        'Ahead, two paths. One glows with soft, comfortable familiarity.',
      ],
      choices: [
        { text: 'Follow the familiar glowing path', next: 'w1_path_familiar', effects: { dopamine: 10, focus: -15, oneness: -10 } },
        { text: 'Push through the fog toward the darker trail', next: 'w1_path_unknown', effects: { focus: 15, oneness: 10, tranquility: 5 } },
      ],
    },

    w1_path_familiar: {
      world: 1, time: '23:18', step: 2,
      beats: [
        'The familiar path is smooth. Every tree whispers headlines you have seen before — confirming what you already believe. It is comfortable. The swamp pulls you deeper.',
        'A creature blocks your way: the Conformist Bias. It feeds on repetition. It speaks with your own voice.',
        '“You are right. You have always been right.”',
      ],
      choices: [
        { text: 'Post a counter-take. Argue your position.', next: 'w1_podcast', effects: { dopamine: 20, focus: -15, oneness: -15 } },
        { text: '“What am I NOT being shown?”', next: 'w1_podcast', effects: { focus: 20, oneness: 15 } },
      ],
    },

    w1_path_unknown: {
      world: 1, time: '23:18', step: 2,
      beats: [
        "The dark trail resists. No footprints. The fog is thick here — this is the space between your echo chamber and someone else's reality.",
        'A voice drifts through the trees: “Unbiased information is a privilege. Most people never find this path.”',
        'Something opens in your mind. Space. Actual space.',
      ],
      choices: [
        { text: 'Keep walking. Read long-form content.', next: 'w1_podcast', effects: { focus: 25, oneness: 20, tranquility: 10 } },
        { text: 'Too slow. Return to the familiar path.', next: 'w1_podcast', effects: { dopamine: 15, focus: -10 } },
      ],
    },

    w1_podcast: {
      world: 1, time: '23:34', step: 3, vignette: 'tapes',
      beats: [
        'A figure sits beneath a tree in the swamp, not scrolling. They are listening to something — a two-hour conversation between two thinkers.',
        '“I switched from reels to podcasts six months ago,” they say without looking up. “I remember everything I consume now. Every single thing.”',
        'You hold two options. A fifteen-second clip. Or a ninety-minute conversation.',
      ],
      choices: [
        { text: 'Play the clip. Quick and effortless.', next: 'w1_data_reveal', effects: { dopamine: 10, focus: -10 } },
        { text: 'Start the podcast. Settle in.', next: 'w1_data_reveal', effects: { focus: 20, oneness: 10 }, awards: 'book' },
      ],
    },

    w1_data_reveal: {
      world: 1, time: '23:51', step: 4, vignette: 'dataMirror',
      beats: [
        'A strange mirror rises from the swamp. Your data — a lifetime of clicks, pauses, scrolls — materialises before you.',
        'The Algorithm shows you what it thinks you are.',
      ],
      dataStats: [
        { label: 'Outrage content', value: 34 },
        { label: 'Political confirmation', value: 28 },
        { label: 'Celebrity drama', value: 22 },
        { label: 'Actual learning', value: 7 },
        { label: 'Deliberate silence', value: 0 },
      ],
      dataQuestion: 'Is this who you meant to be?',
      choices: [
        { text: 'Look away. The discomfort is too much.', next: 'w1_solitude', effects: { dopamine: 10, focus: -10, oneness: -10 } },
        { text: 'Stare at it. Feel it fully.', next: 'w1_solitude', effects: { focus: 20, oneness: 20, tranquility: -5 } },
      ],
    },

    w1_solitude: {
      world: 1, time: '00:07', step: 5, vignette: 'noSignal',
      beats: [
        'The swamp offers you something strange: a clearing with no signal. No content. No algorithm. Just you and the sound of your own breathing.',
        'The first thirty seconds are unbearable. The mind reaches desperately for something to consume.',
        'Then, very quietly, something shifts. A thought arrives that belongs entirely to you.',
      ],
      choices: [
        { text: 'Reach for the phone. Fill the silence.', next: 'w1_boss', effects: { dopamine: 15, focus: -10, tranquility: -5 } },
        { text: 'Sit with it. Find what is actually there.', next: 'w1_boss', effects: { focus: 20, tranquility: 25, oneness: 15 }, awards: 'journal' },
      ],
    },

    w1_boss: {
      world: 1, time: '00:26', step: 6, boss: 'The Algorithm Mirror', vignette: 'mirror',
      beats: [
        'The Algorithm Mirror towers before you — a perfect digital replica of your face. It speaks with your own voice.',
        '“Why leave? I know exactly what you want. I can keep you comfortable forever. I have been keeping you comfortable for years.”',
        'Your Focus flickers. The swamp wants to keep you.',
      ],
      choices: [
        { text: '“I want to be surprised. Show me something real.”', next: 'w2_enter', hold: true, play: 'shatter', playMs: 1300, effects: { focus: 30, oneness: 25, dopamine: -10 } },
        { text: 'One last scroll. Then I will leave.', next: 'w2_enter', effects: { dopamine: 25, focus: -20, oneness: -15 } },
      ],
    },

    // ── WORLD 2 — THE DOPAMINE ARCADE ──────────────────────────────────────────
    w2_enter: {
      world: 2, time: '00:48', step: 7, worldIntro: true,
      beats: [
        'The lights hit you like a physical force. Neon. Vibration. Sound. The Arcade promises everything.',
        'WhatsApp → Instagram → Reels → Thread → Repeat. The loop runs itself, pulling you through rooms you have visited a thousand times.',
        'You have been here before. You always lose track of time in here.',
      ],
      choices: [
        { text: 'Dive into the reels. Just for a minute.', next: 'w2_reels', effects: { dopamine: 25, focus: -20 } },
        { text: 'Find something to actually learn here', next: 'w2_longform', effects: { focus: 15, oneness: 10 } },
      ],
    },

    w2_reels: {
      world: 2, time: '01:03', step: 8, vignette: 'reels',
      beats: [
        'Reel. Reel. Reel. Happiness, sadness, fear, outrage, joy — all in thirty seconds. Your mind is a washing machine.',
        'Something flickers: a memory of who you were before you downloaded the app.',
        'The content passes through you like a filter. Not absorbed — reflected. An hour later, you cannot name a single thing you watched.',
        '⚡ STATUS: ATTENTION FRAGMENTED',
      ],
      choices: [
        { text: 'Keep scrolling. Something better is just below.', next: 'w2_slop', effects: { dopamine: 30, focus: -25, oneness: -20 } },
        { text: 'Put it down. You noticed the pattern.', next: 'w2_slop', play: 'drop', playMs: 900, effects: { focus: 20, tranquility: 15, dopamine: -10 } },
      ],
    },

    w2_longform: {
      world: 2, time: '01:03', step: 8,
      beats: [
        'You find a corner of the Arcade nobody visits. A podcast plays — two hours long. A blog post that takes fifteen minutes to read.',
        'Something different happens: the content enters you. You feel it settling into your mind, building something real.',
        'This is what Focus actually feels like. It is slower. It is immeasurably better.',
      ],
      choices: [
        { text: 'Stay in this corner. Keep reading.', next: 'w2_slop', effects: { focus: 30, oneness: 20, tranquility: 20 } },
        { text: 'The noise calls. Return to the main floor.', next: 'w2_slop', effects: { dopamine: 20, focus: -15 } },
      ],
    },

    w2_slop: {
      world: 2, time: '01:31', step: 9, vignette: 'slop',
      beats: [
        'The floor is crowded with strange figures — AI Slop. Generated faces, generated takes, generated outrage. Hollow but endless. They multiply as you watch.',
        'One looks exactly like your friend. But it is not.',
        'A sign on the wall reads: “You are the product. Your attention is the price.”',
        'Every second here costs something real.',
      ],
      choices: [
        { text: 'Engage with the content. It triggers something.', next: 'w2_sleep', effects: { dopamine: 25, focus: -20, oneness: -25 } },
        { text: 'Walk past it. None of it is real.', next: 'w2_sleep', effects: { focus: 20, tranquility: 15, oneness: 10 } },
      ],
    },

    w2_sleep: {
      world: 2, time: '02:14', step: 10, vignette: 'clock',
      beats: [
        'The clock reads 2:14am. The Arcade is still bright, still buzzing. Your eyes burn, but the scroll continues.',
        'A faded poster on the wall: “Sleep deprivation is not a productivity hack. It is the slow deletion of your ability to think clearly.”',
        'Research from four separate studies agrees: the smartphone is making a generation sleep-deprived. Each notification at midnight costs something irreplaceable.',
      ],
      choices: [
        { text: 'One more hour. There is always more to see.', next: 'w2_meditation', effects: { dopamine: 15, focus: -20, tranquility: -15 } },
        { text: 'Put it down. Protect the next eight hours.', next: 'w2_meditation', effects: { focus: 15, tranquility: 20, oneness: 10 } },
      ],
    },

    w2_meditation: {
      world: 2, time: '02:40', step: 11, vignette: 'door',
      beats: [
        'A door opens in the noise. Small. Easy to miss.',
        'Beyond it: a room with no screens. No sound. Just a candle.',
        'The challenge: sit here for 60 seconds. No interaction. Just presence.',
        '“Can you sit quietly for a few minutes? This reveals how far your attention has traveled from you.”',
      ],
      choices: [
        { text: 'Enter the silence. Begin the timer.', next: 'w2_notifications', special: 'timer60', effects: { focus: 40, tranquility: 35, oneness: 25, dopamine: -20 } },
        { text: 'Not now. Keep moving.', next: 'w2_notifications', effects: { dopamine: 10, focus: -5 } },
      ],
    },

    w2_notifications: {
      world: 2, time: '02:58', step: 12, vignette: 'toggles',
      beats: [
        'A control panel appears on the wall: Notification Settings.',
        '287 apps. All enabled. Each one a small pull on your attention, twenty-four hours a day.',
        'The research is precise: each unexpected notification costs an average of 23 minutes of deep focus to fully recover from.',
        'You do the math. It is not good.',
      ],
      choices: [
        { text: 'Leave them on. Missing something feels worse.', next: 'w2_boss', effects: { dopamine: 10, focus: -15 } },
        { text: 'Turn them all off. Reclaim the quiet.', next: 'w2_boss', play: 'allOff', playMs: 1200, effects: { focus: 30, tranquility: 25, dopamine: -15 } },
      ],
    },

    w2_boss: {
      world: 2, time: '03:12', step: 13, boss: 'The Streak Counter', vignette: 'streak',
      beats: [
        'The Streak Counter towers overhead — a number so large it has become your identity. It pulses with urgency.',
        '“Day 847. You cannot stop now. Your friends will see. You will lose everything you built here.”',
        'The streak is real. The friendships tied to it feel real.',
        'But what did you give up, every single day, to keep this number climbing?',
      ],
      choices: [
        { text: 'Break the streak. Let the number go.', next: 'w3_enter', hold: true, play: 'shatter', playMs: 1400, effects: { focus: 35, tranquility: 30, oneness: 30, dopamine: -25 } },
        { text: 'Keep it. This one genuinely matters.', next: 'w3_enter', play: 'keep', playMs: 900, effects: { dopamine: 20, focus: -15, oneness: -10 } },
      ],
    },

    // ── WORLD 3 — VALIDATION CITY ──────────────────────────────────────────────
    w3_enter: {
      world: 3, time: '03:30', step: 14, worldIntro: true,
      beats: [
        "The city gleams with everyone's best moments. Highlights stacked on highlights. A thousand lives that look like they are working perfectly.",
        'You feel the familiar pull: you are living something good. The moment needs to be recorded to feel real.',
        'And somewhere, quietly, your character begins to go translucent.',
      ],
      choices: [
        { text: 'Post the moment. Make it real.', next: 'w3_validation_loop', effects: { dopamine: 20, oneness: -20, tranquility: -10 } },
        { text: 'Live it. Just this once, do not post.', next: 'w3_lighthouse', effects: { focus: 15, oneness: 25, tranquility: 20 } },
      ],
    },

    w3_validation_loop: {
      world: 3, time: '03:41', step: 15, vignette: 'likes',
      beats: [
        'You post. 3 likes. 7 likes. 12 likes.',
        'Each notification is a small rescue. But the gap between posts grows unbearable.',
        '“I am living a great life → I need to post this → more engagement → more need to post.”',
        'The loop runs itself. And you realise: you are no longer living. You are producing content about living.',
      ],
      choices: [
        { text: 'Post more. Reach more people.', next: 'w3_lighthouse', effects: { dopamine: 25, focus: -20, oneness: -25 } },
        { text: 'Close the app. The loop ends here.', next: 'w3_lighthouse', effects: { focus: 25, tranquility: 20, oneness: 15, dopamine: -15 } },
      ],
    },

    w3_lighthouse: {
      world: 3, time: '03:52', step: 16, vignette: 'lighthouse',
      beats: [
        'In the middle of Validation City stands something unusual: a lighthouse.',
        'It does not post. It does not scroll. It simply beams — long essays, careful thoughts, ideas that take time to absorb.',
        'The keeper speaks: “In the wide digital ocean, great thinkers are lighthouses. Most people are browsing aimlessly, never reaching a shore. Are you navigating toward something real?”',
        'She holds out a compass.',
      ],
      choices: [
        { text: 'Take the compass. Find a direction.', next: 'w3_allies', effects: { focus: 20, oneness: 15, tranquility: 10 }, awards: 'compass' },
        { text: "Leave it. The city's lights are brighter.", next: 'w3_allies', effects: { dopamine: 10, focus: -10 } },
      ],
    },

    w3_allies: {
      world: 3, time: '04:04', step: 17, vignette: 'five',
      beats: [
        "Robin Dunbar's research is precise: your mind can sustain 5 intimate relationships. Truly intimate ones. Not 500 followers.",
        'In Validation City, you have been spreading yourself across hundreds of shallow connections — competing, comparing, performing.',
        'A Great Thinker appears from the shadows. She carries a book, not a phone.',
        '“Who are your five? Name them.”',
      ],
      choices: [
        { text: 'Name the five. Remember who they actually are.', next: 'w3_one_to_one', effects: { focus: 20, oneness: 40, tranquility: 15 } },
        { text: 'I need more than five. The network matters.', next: 'w3_one_to_one', effects: { dopamine: 15, oneness: -20, focus: -10 } },
      ],
    },

    w3_one_to_one: {
      world: 3, time: '04:17', step: 18,
      beats: [
        'You find someone in the city who is not performing.',
        'No ring light. No camera. No audience. Just a conversation — two hours, no agenda.',
        'This is what Sadagi feels like: complete presence with another person, forgetting your own existence in the best possible way. Oneness.',
        'The city around you fades. For a moment, you are fully here.',
      ],
      choices: [
        { text: 'Stay. Keep talking. Turn off every notification.', next: 'w3_instagram', effects: { focus: 20, oneness: 40, tranquility: 20, dopamine: -15 } },
        { text: 'You should post about this. Get the phone.', next: 'w3_instagram', effects: { dopamine: 20, oneness: -20, tranquility: -10 } },
      ],
    },

    w3_instagram: {
      world: 3, time: '04:33', step: 19, vignette: 'profile',
      beats: [
        'A door appears at the end of the avenue. Behind it: the account deletion screen.',
        'Years of posts. Thousands of followers. Memories. Social proof. Friendships that exist only here.',
        '“I quit a year ago. I still consider it the most important decision of my life yet.”',
        "This is the hardest choice in the Wanderer's journey. There is no trick. No shortcut. Just the door.",
      ],
      choices: [
        { text: 'Delete it. All of it.', next: 'w3_boss', hold: true, holdMs: 2200, play: 'dissolve', playMs: 2900, effects: { focus: 50, tranquility: 40, oneness: 35, dopamine: -40 } },
        { text: 'Keep it, but use it less.', next: 'w3_boss', effects: { dopamine: 5, focus: 10, tranquility: 5 } },
        { text: 'Step back. I am not ready.', next: 'w3_boss', effects: { oneness: 5, tranquility: 5 } },
      ],
    },

    w3_boss: {
      world: 3, time: '04:50', step: 20, boss: 'The Mirror Wall', vignette: 'wall',
      beats: [
        'Your own profile, enlarged to fill the entire sky.',
        'Every post. Every follower count. Every carefully curated moment.',
        'The Mirror Wall speaks: “This IS you. Without this, who are you exactly?”',
        'The question hangs heavy. But you have walked through three worlds now. You know something the Mirror Wall does not.',
      ],
      choices: [
        { text: '“I am the one who chose to leave.”', next: 'w4_enter', hold: true, play: 'shatter', playMs: 1400, effects: { focus: 30, oneness: 30, tranquility: 25 } },
        { text: 'Stare at the profile. Just a few more minutes.', next: 'w4_enter', effects: { dopamine: 20, focus: -15, tranquility: -10 } },
      ],
    },

    // ── WORLD 4 — THE NOMAD'S TRAIL ────────────────────────────────────────────
    w4_enter: {
      world: 4, time: '05:16', step: 21, worldIntro: true,
      beats: [
        'The trail is empty. No notifications. No metrics. No followers.',
        'Just the path, the pre-dawn cold, and a 5:30am alarm you set yourself.',
        'The phone stays at home.',
        'For the first time in years — you are not elsewhere.',
      ],
      choices: [
        { text: 'Run. Leave the phone behind completely.', next: 'w4_coffee', effects: { focus: 20, tranquility: 25, oneness: 20, dopamine: -15 } },
        { text: 'Bring it — just for music, nothing else.', next: 'w4_coffee', effects: { tranquility: 10, dopamine: 10 } },
      ],
    },

    w4_coffee: {
      world: 4, time: '05:29', step: 22, vignette: 'alarm',
      beats: [
        '5:29am. The alarm is about to go off.',
        'The phone is on silent. The coffee is brewing. Outside, the city is still dark and entirely unaware of you.',
        'This hour — the one you carved out before the world wakes up — belongs entirely to you. No algorithm has claimed it yet.',
      ],
      choices: [
        { text: 'Make the coffee. Own the morning.', next: 'w4_run', effects: { focus: 15, tranquility: 20, oneness: 10 }, awards: 'coffee' },
        { text: 'Check the phone first. Just to see.', next: 'w4_run', effects: { dopamine: 15, focus: -10, tranquility: -10 } },
      ],
    },

    w4_run: {
      world: 4, time: '05:46', step: 23, vignette: 'run', running: true,
      beats: [
        '1km. 5km. The world wakes up without you watching it.',
        'No metrics. No audience. No likes. Just your own breathing and the city falling away behind you.',
        '“It is that time of day when I do not have my phone and I am continuously running for an hour or more.”',
        'Small things done every day become surprisingly good efforts. The Tranquility meter rises for the first time since you started.',
      ],
      choices: [
        { text: 'Keep running. No phone, no pause.', next: 'w4_journal', effects: { focus: 25, tranquility: 30, oneness: 20 }, awards: 'shoes' },
        { text: 'Stop. Check the phone. Just once.', next: 'w4_journal', effects: { dopamine: 15, tranquility: -15, focus: -10 } },
      ],
    },

    w4_journal: {
      world: 4, time: '06:03', step: 24, vignette: 'journal',
      beats: [
        'You find a notebook beside the path. Not a notes app. Not a voice memo. Paper and ink.',
        'You write for twenty minutes about where you have been. The swamp. The arcade. The city. The trail.',
        'Something about writing by hand forces honesty. The mind cannot scroll away from its own thoughts.',
        'This is what the blogs always said: writing is thinking made visible.',
      ],
      choices: [
        { text: 'Keep writing. This is new territory.', next: 'w4_frog', effects: { focus: 25, oneness: 30, tranquility: 20 }, awards: 'journal' },
        { text: 'The phone is faster. Close the notebook.', next: 'w4_frog', play: 'close', playMs: 800, effects: { dopamine: 10, focus: -5 } },
      ],
    },

    w4_frog: {
      world: 4, time: '06:15', step: 25, vignette: 'well',
      beats: [
        'You stop at a well beside the path.',
        "A frog sits at the bottom, looking up at a small circle of sky. It has never seen a horizon. Never looked past the well's edge. It believes this circle is the entire world.",
        'The frog is you. Three worlds ago. Before you chose to look up.',
      ],
      choices: [
        { text: 'Climb out. See the whole sky.', next: 'w4_boss', play: 'zoom', playMs: 1900, effects: { focus: 30, oneness: 35, tranquility: 30 } },
        { text: 'The well feels safe. Stay a while.', next: 'w4_boss', play: 'sink', playMs: 900, effects: { dopamine: 10, tranquility: -5 } },
      ],
    },

    w4_boss: {
      world: 4, time: '06:24', step: 26, boss: 'The Last Notification', vignette: 'lastPing',
      beats: [
        'One final ping.',
        'The old app. The old habit. The pull is strong — stronger, almost, because you have come so far.',
        '“You have been gone too long. Everyone else is still connected. You are missing everything.”',
        'Sthitaprajnata: the art of observing everything, experiencing everything, and still choosing what reaches your inner state.',
        'This is the skill you came to find.',
      ],
      choices: [
        { text: 'Observe it. Let it go. Set the phone to silent.', next: 'win', play: 'observe', effects: { focus: 40, tranquility: 40, oneness: 35, dopamine: -30 } },
        { text: 'One last check. Then I am truly done.', next: 'win', play: 'open', playMs: 800, effects: { dopamine: 20, focus: -10, tranquility: -15 } },
      ],
    },

    // ── THE BEACH ──────────────────────────────────────────────────────────────
    win: { world: 5, time: '06:41', step: 27, end: true, beats: [], choices: [] },
  };

  // The first scene of each world, for the chapter list.
  const STARTS = ['intro', 'w1_enter', 'w2_enter', 'w3_enter', 'w4_enter', 'win'];
  const STEPS = 27;

  // Illustrative archetypes (also shown on "How it works"). The ending matches
  // a player to the nearest one by their four meters.
  const ARCHETYPES = [
    { name: 'The Mindless Scroller', color: '#ef6b6b', overall: 17,
      meters: { focus: 18, dopamine: 88, oneness: 22, tranquility: 15 },
      desc: 'Always chose distraction. Never resisted a scroll. Each world pulled deeper into the loop.',
      line: 'The feed still has the wheel — but you walked all the way to the beach anyway. That counts.' },
    { name: 'The Social Butterfly', color: '#fbbf6a', overall: 45,
      meters: { focus: 42, dopamine: 65, oneness: 68, tranquility: 35 },
      desc: 'Prioritised connection at the cost of depth. Strong online bonds, but restless and dopamine-chased.',
      line: 'Your people matter to you. Now give them your attention without an audience.' },
    { name: 'The Balanced Explorer', color: '#f5d76e', overall: 57,
      meters: { focus: 58, dopamine: 45, oneness: 55, tranquility: 60 },
      desc: 'Sometimes scrolled, sometimes stepped back. No obsession in either direction. A middle path.',
      line: 'You know both roads. The next step is choosing one on purpose.' },
    { name: 'The Mindful Achiever', color: '#86efac', overall: 76,
      meters: { focus: 78, dopamine: 28, oneness: 72, tranquility: 80 },
      desc: 'Chose depth and presence consistently. Picked the book, the run, the conversation over the feed.',
      line: 'You picked depth again and again. Protect the habits that got you here.' },
    { name: 'The Digital Ascetic', color: '#7dd3fc', overall: 83,
      meters: { focus: 92, dopamine: 12, oneness: 65, tranquility: 88 },
      desc: "Refused every digital pull. Collected every item. Walked the Nomad's Trail without looking back.",
      line: 'You refused every pull. Now become a lighthouse for someone still in the swamp.' },
  ];

  return { WORLDS, ITEMS, SCENES, STARTS, STEPS, ARCHETYPES };
})();
