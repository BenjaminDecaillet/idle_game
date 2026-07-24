/**
 * English string table — the source of truth for all i18n keys.
 * `fr.ts` must provide every key defined here (enforced by its type).
 *
 * Conventions:
 * - `story.<beatId>.title` / `.text` — story beats (see src/game/story.ts)
 * - `tutorial.<stepId>.text` — Gabriel tutorial steps (src/game/tutorial.ts)
 * - `ui.*` — chrome around story/tutorial and the language setting
 * - `{name}` style placeholders are replaced by t(key, params).
 */
export const en = {
  // --- UI chrome -----------------------------------------------------------
  'ui.continue': 'Continue',
  'ui.next': 'Next',
  'ui.skipTutorial': 'Skip tutorial',
  'ui.gabriel': 'Gabriel',
  'ui.storyTitle': 'Your story',
  'ui.language': 'Language',
  'ui.lang.auto': 'Auto',
  'ui.lang.en': 'English',
  'ui.lang.fr': 'Français',
  'ui.namePlaceholder': 'Your name',
  'ui.companyPlaceholder': 'Company name',
  'ui.confirm': 'That’s it!',
  'ui.tutorialStep': 'Step {step} / {total}',

  // --- Missions & VsCoin ---------------------------------------------------
  'ui.missions': 'Missions',
  'ui.claim': 'Claim',
  'ui.claimed': 'VsCoin earned!',
  'ui.vsCoinShop': 'VsCoin Shop',
  'ui.vsCoinShopHint':
    'VsCoin is earned by completing missions and living your story — spend it on exclusives.',
  'ui.vsCoinBoost': 'Golden Sprint — ×{mult} output for {duration}',
  'ui.vsCoinBoostBought': 'Golden Sprint activated!',
  'ui.buyFor': 'Buy for {price}',
  'mission.projectsCompleted': 'Complete {target} projects',
  'mission.totalEarned': 'Earn {target} in total',
  'mission.workers': 'Employ {target} people',
  'mission.companies': 'Own {target} companies',
  'mission.upgradeLevels': 'Buy {target} upgrade levels',
  'mission.desks': 'Own {target} workstations',

  // --- Founder office & avatar customization -------------------------------
  'ui.founderOffice': 'Founder’s Office',
  'ui.customize': 'Customize',
  'ui.done': 'Done',
  'ui.renameAvatar': 'Change name',
  'look.skin': 'Skin',
  'look.hair': 'Hair color',
  'look.hairstyle': 'Hairstyle',
  'look.eyeStyle': 'Eyes',
  'look.mouthStyle': 'Mouth',
  'look.facialHair': 'Facial hair',
  'look.outfit': 'Outfit',
  'look.accessory': 'Accessory',

  // --- Tutorial (Gabriel speaking) ----------------------------------------
  'tutorial.welcome.text':
    'Hi! I’m Gabriel, your very own angel investor — the guardian kind. You dream of building an AI that helps everyone, and I’m here to get you from this garage to the stars. Ready?',
  'tutorial.name-avatar.text':
    'First things first: every great founder story needs a name on the cover. What should I call you?',
  'tutorial.name-company.text':
    'Beautiful. Now the company itself — pick a name worth printing on a rocket someday.',
  'tutorial.hire.text':
    'A company is people. Open the Team tab and hire your first employee — an intern with big dreams will do just fine.',
  'tutorial.desk.text':
    'Your new hire is standing around! Nobody codes standing in a garage. Go to the Office tab and buy them a desk.',
  'tutorial.upgrade.text':
    'Watch that progress bar go! Here — a little angel-investor gift of {gift}. Spend it in the Upgrades tab; an espresso machine works miracles on output.',
  'tutorial.train.text':
    'One more founder secret: people grow. In the Team tab, send someone to a training program — they’ll come back stronger.',
  'tutorial.outro.text':
    'That’s everything you need. Ship projects, grow the team, found new companies across the map — and never lose sight of the dream. I’ll check in along the way!',

  // --- Story beats (earnest AGI-dream arc) ---------------------------------
  'story.dawn.title': 'A garage and a dream',
  'story.dawn.text':
    'Everyone laughed when you said it out loud: an AI that genuinely helps everyone, free as sunlight. Let them laugh. Dreams this size always start between a lawnmower and a surfboard.',

  'story.first-hire.title': 'The first believer',
  'story.first-hire.text':
    'Someone read your little job post and said yes. One desk, two dreamers — statistically speaking, your company culture just doubled.',

  'story.first-payout.title': 'First money in',
  'story.first-payout.text':
    'A client actually paid! It’s not about the money — it’s about the runway the money buys for the dream. But also, it is a little bit about the money.',

  'story.first-thousand.title': 'A thousand honest dollars',
  'story.first-thousand.text':
    'The first thousand is the hardest, they say. You earned it one landing page at a time. The AI of your dreams doesn’t exist yet — but its bank account does.',

  'story.full-garage.title': 'A real team',
  'story.full-garage.text':
    'Four people now squeeze past the lawnmower every morning. The garage smells of coffee and ambition. This is officially no longer a hobby.',

  'story.first-upgrade.title': 'Investing in the crew',
  'story.first-upgrade.text':
    'You spent money on your people instead of yourself. Remember this feeling — it’s the exact habit that builds companies worth believing in.',

  'story.hundred-k.title': 'Six figures',
  'story.hundred-k.text':
    'A hundred thousand dollars, earned by shipping real things. Investors are starting to return your calls. Some of them even pronounce your name right.',

  'story.site-loft.title': 'Goodbye, garage',
  'story.site-loft.text':
    'A second company, in a real loft with real exposed brick. You kept the garage, of course. Empires remember where they were born.',

  'story.site-paloalto.title': 'Palo Alto',
  'story.site-paloalto.text':
    'Three companies. Your Palo Alto office sits walking distance from the people who said no to you last year. You wave at them every morning. Kindly.',

  'story.ten-million.title': 'Ten million',
  'story.ten-million.text':
    'The number has stopped feeling real, so you taped a photo of the old garage to your monitor. The dream stays the same size even when the money doesn’t.',

  'story.site-campus.title': 'The campus',
  'story.site-campus.text':
    'Nap pods, free lunches, a climbing wall nobody uses. More importantly: hundreds of desks pointed at the same dream. You hire kind people. It shows.',

  'story.site-tower.title': 'The skyline',
  'story.site-tower.text':
    'Your logo is visible from two bridges. Somewhere below, someone in a garage is pointing at your tower saying "one day". You know exactly how they feel.',

  'story.one-billion.title': 'The B word',
  'story.one-billion.text':
    'A billion dollars earned. The magazines want the yacht story; you keep giving them the same boring answer: it’s all fuel for the lab. They never print it.',

  'story.site-seattle.title': 'North to the clouds',
  'story.site-seattle.text':
    'Seattle: rain outside, servers inside. Your cloud campus hums day and night now — the dream needs more compute than California has roofs for.',

  'story.site-nyc.title': 'The Flatiron hub',
  'story.site-nyc.text':
    'Wall Street meets your changelog. New York gives the dream something the Valley never could: people who ask "why?" at every meeting. You hire the loudest ones.',

  'story.agi-unlocked.title': 'The Lab opens',
  'story.agi-unlocked.text':
    'The AGI Research Lab is real. Whiteboards everywhere, coffee machines under strain. Every project you ever shipped was secretly practice for this one.',

  'story.agi-shipped.title': 'It works',
  'story.agi-shipped.text':
    'At 3:12 a.m. the lab went quiet, and then very loud. It answered. It helped. It was kind — because you built it that way. Now the world needs to meet it.',

  'story.site-orbital.title': 'Orbital HQ',
  'story.site-orbital.text':
    'Zero gravity, zero distractions. From up here there are no borders on the planet — which is convenient, because your AI was never meant to stop at any.',

  'story.dream-achieved.title': 'Free as sunlight',
  'story.dream-achieved.text':
    'From the orbital lab, your AI now reaches everyone — every language, every timezone, free as sunlight, exactly like you promised the lawnmower. They’re not laughing anymore. They’re building garages of their own.',
} as const;
