// game-scenes.js — Scene data for The Wanderer's Digital Escape (v2)
window.SCENES = {

  // ── INTRO ────────────────────────────────────────────────────────────────────
  intro: {
    id: 'intro', world: 0, background: 'intro',
    narrative: "Your phone glows on the nightstand.\n\n47 notifications. 7 hours of screen time, and the day isn't over.\n\nSomewhere far beyond the feeds, past the reels, past the endless recommended content — there is a beach. Still. Quiet. Real.\n\n\"You are forever elsewhere. Tonight, you choose to come back.\"",
    choices: [
      { text: '📱  Check notifications first…', next: 'w1_enter', effects: { dopamine: 15, focus: -10, oneness: -5 } },
      { text: '🌙  Set the phone face down. Begin.', next: 'w1_enter', effects: { focus: 15, tranquility: 10, oneness: 5 } }
    ]
  },

  // ── WORLD 1 — ECHO CHAMBER SWAMP ─────────────────────────────────────────────
  w1_enter: {
    id: 'w1_enter', world: 1, background: 'swamp', worldIntro: true,
    worldName: 'World 1', worldSubtitle: 'Echo Chamber Swamp',
    worldDesc: 'You only see what confirms what you already think.',
    narrative: "The fog settles around your ankles. Every tree looks familiar — because they are all your own thoughts, reflected back.\n\nThe Algorithm has mapped your mind with perfect precision. It knows what you will click before you do.\n\nAhead, two paths. One glows with soft, comfortable familiarity.",
    choices: [
      { text: 'Follow the familiar glowing path', next: 'w1_path_familiar', effects: { dopamine: 10, focus: -15, oneness: -10 } },
      { text: 'Push through fog toward the darker trail', next: 'w1_path_unknown', effects: { focus: 15, oneness: 10, tranquility: 5 } }
    ]
  },

  w1_path_familiar: {
    id: 'w1_path_familiar', world: 1, background: 'swamp',
    narrative: "The familiar path is smooth. Every tree whispers headlines you have seen before — confirming what you already believe. It is comfortable. The swamp pulls you deeper.\n\nA creature blocks your way: the Conformist Bias. It feeds on repetition. It speaks with your own voice.\n\n\"You are right. You have always been right.\"",
    choices: [
      { text: 'Post a counter-take. Argue your position.', next: 'w1_podcast', effects: { dopamine: 20, focus: -15, oneness: -15 } },
      { text: '"What am I NOT being shown?"', next: 'w1_podcast', effects: { focus: 20, oneness: 15 } }
    ]
  },

  w1_path_unknown: {
    id: 'w1_path_unknown', world: 1, background: 'swamp',
    narrative: "The dark trail resists. No footprints. The fog is thick here — this is the space between your echo chamber and someone else's reality.\n\nA voice drifts through the trees: \"Unbiased information is a privilege. Most people never find this path.\"\n\nSomething opens in your mind. Space. Actual space.",
    choices: [
      { text: 'Keep walking. Read long-form content.', next: 'w1_podcast', effects: { focus: 25, oneness: 20, tranquility: 10 } },
      { text: 'Too slow. Return to the familiar path.', next: 'w1_podcast', effects: { dopamine: 15, focus: -10 } }
    ]
  },

  w1_podcast: {
    id: 'w1_podcast', world: 1, background: 'swamp',
    narrative: "A figure sits beneath a tree in the swamp, not scrolling. They are listening to something — a two-hour conversation between two thinkers.\n\n\"I switched from reels to podcasts six months ago,\" they say without looking up. \"I remember everything I consume now. Every single thing.\"\n\nYou hold two options. A fifteen-second clip. Or a ninety-minute conversation.",
    choices: [
      { text: 'Play the clip. Quick and effortless.', next: 'w1_data_reveal', effects: { dopamine: 10, focus: -10 } },
      { text: 'Start the podcast. Settle in.', next: 'w1_data_reveal', effects: { focus: 20, oneness: 10 }, awards: 'book' }
    ]
  },

  w1_data_reveal: {
    id: 'w1_data_reveal', world: 1, background: 'swamp', special: 'dataReveal',
    narrative: "A strange mirror rises from the swamp. Your data — a lifetime of clicks, pauses, scrolls — materialises before you.\n\nThe Algorithm shows you what it thinks you are.",
    dataStats: [
      { label: 'Outrage content', value: 34 },
      { label: 'Celebrity drama', value: 22 },
      { label: 'Political confirmation', value: 28 },
      { label: 'Actual learning', value: 7 },
      { label: 'Deliberate silence', value: 0 }
    ],
    dataQuestion: "Is this who you meant to be?",
    choices: [
      { text: 'Look away. The discomfort is too much.', next: 'w1_solitude', effects: { dopamine: 10, focus: -10, oneness: -10 } },
      { text: 'Stare at it. Feel it fully.', next: 'w1_solitude', effects: { focus: 20, oneness: 20, tranquility: -5 } }
    ]
  },

  w1_solitude: {
    id: 'w1_solitude', world: 1, background: 'swamp',
    narrative: "The swamp offers you something strange: a clearing with no signal. No content. No algorithm. Just you and the sound of your own breathing.\n\nThe first thirty seconds are unbearable. The mind reaches desperately for something to consume.\n\nThen, very quietly, something shifts. A thought arrives that belongs entirely to you.",
    choices: [
      { text: 'Reach for the phone. Fill the silence.', next: 'w1_boss', effects: { dopamine: 15, focus: -10, tranquility: -5 } },
      { text: 'Sit with it. Find what is actually there.', next: 'w1_boss', effects: { focus: 20, tranquility: 25, oneness: 15 }, awards: 'journal' }
    ]
  },

  w1_boss: {
    id: 'w1_boss', world: 1, background: 'swamp', boss: true, bossName: 'The Algorithm Mirror',
    narrative: "The Algorithm Mirror towers before you — a perfect digital replica of your face. It speaks with your own voice.\n\n\"Why leave? I know exactly what you want. I can keep you comfortable forever. I have been keeping you comfortable for years.\"\n\nYour Focus flickers. The swamp wants to keep you.",
    choices: [
      { text: '"I want to be surprised. Show me something real."', next: 'w2_enter', effects: { focus: 30, oneness: 25, dopamine: -10 }, worldClear: 1 },
      { text: 'One last scroll. Then I will leave.', next: 'w2_enter', effects: { dopamine: 25, focus: -20, oneness: -15 }, worldClear: 1 }
    ]
  },

  // ── WORLD 2 — DOPAMINE ARCADE ─────────────────────────────────────────────────
  w2_enter: {
    id: 'w2_enter', world: 2, background: 'arcade', worldIntro: true,
    worldName: 'World 2', worldSubtitle: 'The Dopamine Arcade',
    worldDesc: 'Everything is exciting. Nothing is remembered.',
    narrative: "The lights hit you like a physical force. Neon. Vibration. Sound. The Arcade promises everything.\n\nWhatsApp → Instagram → Reels → Thread → Repeat. The loop runs itself, pulling you through rooms you have visited a thousand times.\n\nYou have been here before. You always lose track of time in here.",
    choices: [
      { text: 'Dive into the reels. Just for a minute.', next: 'w2_reels', effects: { dopamine: 25, focus: -20 } },
      { text: 'Find something to actually learn here', next: 'w2_longform', effects: { focus: 15, oneness: 10 } }
    ]
  },

  w2_reels: {
    id: 'w2_reels', world: 2, background: 'arcade',
    narrative: "Reel. Reel. Reel. Happiness, sadness, fear, outrage, joy — all in thirty seconds. Your mind is a washing machine.\n\nSomething flickers: a memory of who you were before you downloaded the app.\n\nThe content passes through you like a filter. Not absorbed — reflected. An hour later, you cannot name a single thing you watched.\n\n⚡ STATUS: ATTENTION FRAGMENTED",
    choices: [
      { text: 'Keep scrolling. Something better is just below.', next: 'w2_slop', effects: { dopamine: 30, focus: -25, oneness: -20 } },
      { text: 'Put it down. You noticed the pattern.', next: 'w2_slop', effects: { focus: 20, tranquility: 15, dopamine: -10 } }
    ]
  },

  w2_longform: {
    id: 'w2_longform', world: 2, background: 'arcade',
    narrative: "You find a corner of the Arcade nobody visits. A podcast plays — two hours long. A blog post that takes fifteen minutes to read.\n\nSomething different happens: the content enters you. You feel it settling into your mind, building something real.\n\nThis is what Focus actually feels like. It is slower. It is immeasurably better.",
    choices: [
      { text: 'Stay in this corner. Keep reading.', next: 'w2_slop', effects: { focus: 30, oneness: 20, tranquility: 20 } },
      { text: 'The noise calls. Return to the main floor.', next: 'w2_slop', effects: { dopamine: 20, focus: -15 } }
    ]
  },

  w2_slop: {
    id: 'w2_slop', world: 2, background: 'arcade',
    narrative: "The floor is crowded with strange figures — AI Slop. Generated faces, generated takes, generated outrage. Hollow but endless. They multiply as you watch.\n\nOne looks exactly like your friend. But it is not.\n\nA sign on the wall reads: \"You are the product. Your attention is the price.\"\n\nEvery second here costs something real.",
    choices: [
      { text: 'Engage with the content. It triggers something.', next: 'w2_sleep', effects: { dopamine: 25, focus: -20, oneness: -25 } },
      { text: 'Walk past it. None of it is real.', next: 'w2_sleep', effects: { focus: 20, tranquility: 15, oneness: 10 } }
    ]
  },

  w2_sleep: {
    id: 'w2_sleep', world: 2, background: 'arcade',
    narrative: "The clock reads 2:14am. The Arcade is still bright, still buzzing. Your eyes burn, but the scroll continues.\n\nA faded poster on the wall: \"Sleep deprivation is not a productivity hack. It is the slow deletion of your ability to think clearly.\"\n\nResearch from four separate studies agrees: the smartphone is making a generation sleep-deprived. Each notification at midnight costs something irreplaceable.",
    choices: [
      { text: 'One more hour. There is always more to see.', next: 'w2_meditation', effects: { dopamine: 15, focus: -20, tranquility: -15 } },
      { text: 'Put it down. Protect the next eight hours.', next: 'w2_meditation', effects: { focus: 15, tranquility: 20, oneness: 10 } }
    ]
  },

  w2_meditation: {
    id: 'w2_meditation', world: 2, background: 'arcade',
    narrative: "A door opens in the noise. Small. Easy to miss.\n\nBeyond it: a room with no screens. No sound. Just a candle.\n\nThe challenge: sit here for 60 seconds. No interaction. Just presence.\n\n\"Can you sit quietly for a few minutes? This reveals how far your attention has traveled from you.\"",
    choices: [
      { text: 'Enter the silence. Begin the timer.', next: 'w2_notifications', special: 'timer60', effects: { focus: 40, tranquility: 35, oneness: 25, dopamine: -20 } },
      { text: 'Not now. Keep moving.', next: 'w2_notifications', effects: { dopamine: 10, focus: -5 } }
    ]
  },

  w2_notifications: {
    id: 'w2_notifications', world: 2, background: 'arcade',
    narrative: "A control panel appears on the wall: Notification Settings.\n\n287 apps. All enabled. Each one a small pull on your attention, twenty-four hours a day.\n\nThe research is precise: each unexpected notification costs an average of 23 minutes of deep focus to fully recover from.\n\nYou do the math. It is not good.",
    choices: [
      { text: 'Leave them on. Missing something feels worse.', next: 'w2_boss', effects: { dopamine: 10, focus: -15 } },
      { text: 'Turn them all off. Reclaim the quiet.', next: 'w2_boss', effects: { focus: 30, tranquility: 25, dopamine: -15 } }
    ]
  },

  w2_boss: {
    id: 'w2_boss', world: 2, background: 'arcade', boss: true, bossName: 'The Streak Counter',
    narrative: "The Streak Counter towers overhead — a number so large it has become your identity. It pulses with urgency.\n\n\"Day 847. You cannot stop now. Your friends will see. You will lose everything you built here.\"\n\nThe streak is real. The friendships tied to it feel real.\n\nBut what did you give up, every single day, to keep this number climbing?",
    choices: [
      { text: 'Break the streak. Let the number go.', next: 'w3_enter', effects: { focus: 35, tranquility: 30, oneness: 30, dopamine: -25 }, worldClear: 2 },
      { text: 'Keep it. This one genuinely matters.', next: 'w3_enter', effects: { dopamine: 20, focus: -15, oneness: -10 }, worldClear: 2 }
    ]
  },

  // ── WORLD 3 — VALIDATION CITY ─────────────────────────────────────────────────
  w3_enter: {
    id: 'w3_enter', world: 3, background: 'city', worldIntro: true,
    worldName: 'World 3', worldSubtitle: 'Validation City',
    worldDesc: 'Everyone is watching. No one is connecting.',
    narrative: "The city gleams with everyone's best moments. Highlights stacked on highlights. A thousand lives that look like they are working perfectly.\n\nYou feel the familiar pull: you are living something good. The moment needs to be recorded to feel real.\n\nAnd somewhere, quietly, your character begins to go translucent.",
    choices: [
      { text: 'Post the moment. Make it real.', next: 'w3_validation_loop', effects: { dopamine: 20, oneness: -20, tranquility: -10 } },
      { text: 'Live it. Just this once, do not post.', next: 'w3_lighthouse', effects: { focus: 15, oneness: 25, tranquility: 20 } }
    ]
  },

  w3_validation_loop: {
    id: 'w3_validation_loop', world: 3, background: 'city',
    narrative: "You post. 3 likes. 7 likes. 12 likes.\n\nEach notification is a small rescue. But the gap between posts grows unbearable.\n\n\"I am living a great life → I need to post this → more engagement → more need to post.\"\n\nThe loop runs itself. And you realise: you are no longer living. You are producing content about living.",
    choices: [
      { text: 'Post more. Reach more people.', next: 'w3_lighthouse', effects: { dopamine: 25, focus: -20, oneness: -25 } },
      { text: 'Close the app. The loop ends here.', next: 'w3_lighthouse', effects: { focus: 25, tranquility: 20, oneness: 15, dopamine: -15 } }
    ]
  },

  w3_lighthouse: {
    id: 'w3_lighthouse', world: 3, background: 'city',
    narrative: "In the middle of Validation City stands something unusual: a lighthouse.\n\nIt does not post. It does not scroll. It simply beams — long essays, careful thoughts, ideas that take time to absorb.\n\nThe keeper speaks: \"In the wide digital ocean, great thinkers are lighthouses. Most people are browsing aimlessly, never reaching a shore. Are you navigating toward something real?\"\n\nShe holds out a compass.",
    choices: [
      { text: 'Take the compass. Find a direction.', next: 'w3_allies', effects: { focus: 20, oneness: 15, tranquility: 10 }, awards: 'compass' },
      { text: "Leave it. The city's lights are brighter.", next: 'w3_allies', effects: { dopamine: 10, focus: -10 } }
    ]
  },

  w3_allies: {
    id: 'w3_allies', world: 3, background: 'city', special: 'dunbar',
    narrative: "Robin Dunbar's research is precise: your mind can sustain 5 intimate relationships. Truly intimate ones. Not 500 followers.\n\nIn Validation City, you have been spreading yourself across hundreds of shallow connections — competing, comparing, performing.\n\nA Great Thinker appears from the shadows. She carries a book, not a phone.",
    dunbarQuote: '"Who are your five? Name them."',
    choices: [
      { text: 'Name the five. Remember who they actually are.', next: 'w3_one_to_one', effects: { focus: 20, oneness: 40, tranquility: 15 } },
      { text: 'I need more than five. The network matters.', next: 'w3_one_to_one', effects: { dopamine: 15, oneness: -20, focus: -10 } }
    ]
  },

  w3_one_to_one: {
    id: 'w3_one_to_one', world: 3, background: 'city',
    narrative: "You find someone in the city who is not performing.\n\nNo ring light. No camera. No audience. Just a conversation — two hours, no agenda.\n\nThis is what Sadagi feels like: complete presence with another person, forgetting your own existence in the best possible way. Oneness.\n\nThe city around you fades. For a moment, you are fully here.",
    choices: [
      { text: 'Stay. Keep talking. Turn off every notification.', next: 'w3_instagram', effects: { focus: 20, oneness: 40, tranquility: 20, dopamine: -15 } },
      { text: 'You should post about this. Get the phone.', next: 'w3_instagram', effects: { dopamine: 20, oneness: -20, tranquility: -10 } }
    ]
  },

  w3_instagram: {
    id: 'w3_instagram', world: 3, background: 'city', special: 'deleteInstagram',
    narrative: "A door appears at the end of the avenue.\n\nBehind it: the account deletion screen.\n\nYears of posts. Thousands of followers. Memories. Social proof. Friendships that exist only here.\n\n\"I quit a year ago. I still consider it the most important decision of my life yet.\"\n\nThis is the hardest choice in the Wanderer's journey. There is no trick. No shortcut. Just the door.",
    choices: [
      { text: '🗑️  Delete it. All of it.', next: 'w3_boss', special: 'deleteInstagram', effects: { focus: 50, tranquility: 40, oneness: 35, dopamine: -40 } },
      { text: 'Keep it, but use it less.', next: 'w3_boss', effects: { dopamine: 5, focus: 10, tranquility: 5 } },
      { text: 'Step back. I am not ready.', next: 'w3_boss', effects: { oneness: 5, tranquility: 5 } }
    ]
  },

  w3_boss: {
    id: 'w3_boss', world: 3, background: 'city', boss: true, bossName: 'The Mirror Wall',
    narrative: "Your own profile, enlarged to fill the entire sky.\n\nEvery post. Every follower count. Every carefully curated moment.\n\nThe Mirror Wall speaks: \"This IS you. Without this, who are you exactly?\"\n\nThe question hangs heavy. But you have walked through three worlds now. You know something the Mirror Wall does not.",
    choices: [
      { text: '"I am the one who chose to leave."', next: 'w4_enter', effects: { focus: 30, oneness: 30, tranquility: 25 }, worldClear: 3 },
      { text: 'Stare at the profile. Just a few more minutes.', next: 'w4_enter', effects: { dopamine: 20, focus: -15, tranquility: -10 }, worldClear: 3 }
    ]
  },

  // ── WORLD 4 — THE NOMAD'S TRAIL ───────────────────────────────────────────────
  w4_enter: {
    id: 'w4_enter', world: 4, background: 'trail', worldIntro: true,
    worldName: 'World 4', worldSubtitle: "The Nomad's Trail",
    worldDesc: 'The world is still here. You just forgot to look.',
    narrative: "The trail is empty. No notifications. No metrics. No followers.\n\nJust the path, the pre-dawn cold, and a 5:30am alarm you set yourself.\n\nThe phone stays at home.\n\nFor the first time in years — you are not elsewhere.",
    choices: [
      { text: 'Run. Leave the phone behind completely.', next: 'w4_coffee', effects: { focus: 20, tranquility: 25, oneness: 20, dopamine: -15 } },
      { text: 'Bring it — just for music, nothing else.', next: 'w4_coffee', effects: { tranquility: 10, dopamine: 10 } }
    ]
  },

  w4_coffee: {
    id: 'w4_coffee', world: 4, background: 'trail',
    narrative: "5:29am. The alarm is about to go off.\n\nThe phone is on silent. The coffee is brewing. Outside, the city is still dark and entirely unaware of you.\n\nThis hour — the one you carved out before the world wakes up — belongs entirely to you. No algorithm has claimed it yet.",
    choices: [
      { text: 'Make the coffee. Own the morning.', next: 'w4_run', effects: { focus: 15, tranquility: 20, oneness: 10 }, awards: 'coffee' },
      { text: 'Check the phone first. Just to see.', next: 'w4_run', effects: { dopamine: 15, focus: -10, tranquility: -10 } }
    ]
  },

  w4_run: {
    id: 'w4_run', world: 4, background: 'trail',
    narrative: "1km. 5km. The world wakes up without you watching it.\n\nNo metrics. No audience. No likes. Just your own breathing and the city falling away behind you.\n\n\"It is that time of day when I do not have my phone and I am continuously running for an hour or more.\"\n\nSmall things done every day become surprisingly good efforts. The Tranquility meter rises for the first time since you started.",
    choices: [
      { text: 'Keep running. No phone, no pause.', next: 'w4_journal', effects: { focus: 25, tranquility: 30, oneness: 20 }, awards: 'shoes' },
      { text: 'Stop. Check the phone. Just once.', next: 'w4_journal', effects: { dopamine: 15, tranquility: -15, focus: -10 } }
    ]
  },

  w4_journal: {
    id: 'w4_journal', world: 4, background: 'trail',
    narrative: "You find a notebook beside the path. Not a notes app. Not a voice memo. Paper and ink.\n\nYou write for twenty minutes about where you have been. The swamp. The arcade. The city. The trail.\n\nSomething about writing by hand forces honesty. The mind cannot scroll away from its own thoughts.\n\nThis is what the blogs always said: writing is thinking made visible.",
    choices: [
      { text: 'Keep writing. This is new territory.', next: 'w4_frog', effects: { focus: 25, oneness: 30, tranquility: 20 }, awards: 'journal' },
      { text: 'The phone is faster. Close the notebook.', next: 'w4_frog', effects: { dopamine: 10, focus: -5 } }
    ]
  },

  w4_frog: {
    id: 'w4_frog', world: 4, background: 'trail', special: 'frogZoomOut',
    narrative: "You stop at a well beside the path.\n\nA frog sits at the bottom, looking up at a small circle of sky. It has never seen a horizon. Never looked past the well's edge. It believes this circle is the entire world.\n\nThe frog is you. Three worlds ago. Before you chose to look up.",
    choices: [
      { text: 'Climb out. See the whole sky.', next: 'w4_boss', effects: { focus: 30, oneness: 35, tranquility: 30 } },
      { text: 'The well feels safe. Stay a while.', next: 'w4_boss', effects: { dopamine: 10, tranquility: -5 } }
    ]
  },

  w4_boss: {
    id: 'w4_boss', world: 4, background: 'trail', boss: true, bossName: 'The Last Notification',
    narrative: "One final ping.\n\nThe old app. The old habit. The pull is strong — stronger, almost, because you have come so far.\n\n\"You have been gone too long. Everyone else is still connected. You are missing everything.\"\n\nSthitaprajnata: the art of observing everything, experiencing everything, and still choosing what reaches your inner state.\n\nThis is the skill you came to find.",
    choices: [
      { text: 'Observe it. Let it go. Set the phone to silent.', next: 'win', effects: { focus: 40, tranquility: 40, oneness: 35, dopamine: -30 }, worldClear: 4 },
      { text: 'One last check. Then I am truly done.', next: 'win', effects: { dopamine: 20, focus: -10, tranquility: -15 }, worldClear: 4 }
    ]
  },

  // ── WIN SCREEN ────────────────────────────────────────────────────────────────
  win: {
    id: 'win', world: 5, background: 'beach', special: 'winScreen'
  }
};
