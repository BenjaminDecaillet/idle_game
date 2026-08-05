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
  'ui.build': 'Build',
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
  'mission.promotions': 'Promote employees {target} times',
  'mission.countries': 'Expand to {target} countries',
  'mission.builders': 'Grow your construction crew to {target} workers',

  // --- Employees: training, promotion, fast-forward ------------------------
  'ui.inTraining': 'In training · +{levels} levels in {time}',
  'ui.inPromotion': 'Promotion to {title} · done in {time}',
  'ui.promote': 'Promote',
  'ui.promotionStarted': 'Leadership bootcamp started!',
  'ui.promoted': 'Promotion complete!',
  'ui.maxGrade': 'Top of the ladder',
  'ui.fastForwarded': 'Done — time is money!',
  'ui.free': 'Free',
  'ui.workerQuit': '{name} quit over unpaid wages!',

  // --- Builder pool (code: builders — displays as "Workers") ----------------
  'ui.builders': 'Workers',
  'ui.buildersFree': '{free}/{total} available',
  'ui.hireBuilder': 'Hire a worker',
  'ui.builderGiftName': 'Doug Foundations',
  'ui.builderGiftHint':
    'Your work crew builds floors, renovates desks and runs the trainings. {name} — your first worker — was a gift from Gabriel.',
  'error.noFreeBuilders': 'All workers are busy — wait for a job to finish or hire another.',

  // --- Floor construction ---------------------------------------------------
  'ui.floorBuilding': 'Floor {floor} under construction · done in {time}',
  'ui.floorBuildingShort': 'Under construction',
  'ui.builderOnSite': '1 worker on site',
  'ui.floorBuildStarted': 'Construction started!',
  'ui.floorBuilt': 'New floor ready!',
  'ui.floorGift': 'Claim Gabriel’s gift: a free second floor',
  'ui.floorGiftClaimed': 'Gabriel built you a floor — and left a free fast-forward!',
  'error.floorAlreadyBuilding': 'A floor is already under construction.',
  'error.floorGiftUnavailable': 'Gabriel’s gift isn’t available here.',

  // --- Company founding -----------------------------------------------------
  'ui.siteBuilding': 'Under construction · opens in {time}',
  'ui.companyBuildStarted': 'Construction crew dispatched!',
  'ui.companyBuilt': '{name} is open for business!',
  'error.siteAlreadyBuilding': 'A company is already under construction there.',

  // --- Shop (funding rounds: VsCoin → cash) --------------------------------
  'ui.shopTitle': 'Funding rounds',
  'ui.shopHint':
    'Trade VsCoin for a cash injection into the country you are managing. Pack value scales with your current income, so a round stays meaningful at every stage.',
  'ui.shopDebtNote': 'You are in debt: fresh funding pays the debt down first — it is one wallet.',
  'ui.packRequires': 'Needs {count} companies',
  'ui.packBought': '{name} closed — {cash} wired!',
  'shop.pack.seed.name': 'Seed round',
  'shop.pack.seed.blurb': 'A friendly angel wires you a little runway.',
  'shop.pack.series-a.name': 'Series A',
  'shop.pack.series-a.blurb': 'A real term sheet. The partners want a demo.',
  'shop.pack.series-b.name': 'Series B',
  'shop.pack.series-b.blurb': 'Growth capital — the board deck writes itself.',
  'shop.pack.series-c.name': 'Series C',
  'shop.pack.series-c.blurb': 'Late-stage money. Private jets circle the block.',
  'shop.pack.ipo.name': 'IPO bell',
  'shop.pack.ipo.blurb': 'Ring it. The market does the rest.',

  // --- VsCoin acquisition tab -----------------------------------------------
  'ui.vscoinTitle': 'Get VsCoin',
  'ui.vscoinHint':
    'VsCoin buys fast-forwards, workers, funding rounds and premium perks. You also earn it through missions and your story.',
  'ui.betaBadge': 'BETA',
  'ui.claimFree': 'Claim free',
  'ui.vscoinClaimed': '+{coins} VsCoin — enjoy!',
  'ui.comingSoon': 'Coming with monetization',
  'ui.vscoinBetaNote':
    'While the beta runs, the starter pack is free and unlimited — no strings attached.',
  'error.iapComingSoon': 'Real purchases arrive after the beta — the starter pack is on us!',
  'vscoin.pack.vsc-starter.name': 'Starter espresso',
  'vscoin.pack.vsc-angel.name': 'Angel wings',
  'vscoin.pack.vsc-venture.name': 'Venture vault',
  'vscoin.pack.vsc-growth.name': 'Growth rocket',
  'vscoin.pack.vsc-unicorn.name': 'Unicorn hoard',

  // --- Desk upgrades --------------------------------------------------------
  'ui.renovations': 'Renovations',
  'ui.upgradeDesk': 'Upgrade',
  'ui.deskUpgrading': 'Under renovation · done in {time}',
  'ui.deskUpgradeStarted': 'Renovation started!',

  // --- Missions UX ----------------------------------------------------------
  'ui.missionComplete': 'Mission complete — claim your VsCoin!',
  'ui.dailyTitle': 'Today’s contracts',
  'ui.dailyHint':
    'Three fresh contracts every day — only progress made today counts. Come back tomorrow for a new board!',

  // --- Goal chip (next-best action under the HUD) -----------------------------
  // goal.* strings are spliced into goalNext/goalSave mid-sentence: keep them
  // lowercase-leading in every language.
  'ui.goalNext': 'Next: {goal} — {cost}',
  'ui.goalSave': 'Save up {cost} → {goal}',
  'ui.goal.hire': 'hire a new employee',
  'ui.goal.desk': 'buy a workstation',
  'ui.goal.unlockProject': 'unlock {name}',
  'ui.goal.upgrade': 'buy {name}',
  'ui.goal.floor': 'add a floor',
  'ui.goal.country': 'expand to a new country',
  'ui.goal.company': 'found a company at {name}',

  // --- Companies: soft caps, slots, renaming --------------------------------
  'ui.softCap': 'CAP',
  'ui.softCapHint':
    'This contract has hit its ceiling here — a bigger company can go further.',
  'ui.projectSlotsHint':
    'Every floor has its own project slot — give each floor its own contract, or keep everyone on the main one.',
  'ui.mainProject': 'Main project',
  'ui.groundFloor': 'Ground floor',
  'ui.floorN': 'Floor {floor}',

  // --- Office tab: companies → building → floor drill-down -----------------
  'ui.officeCompanies': 'Your companies',
  'ui.officeAllCompanies': '‹ All companies',
  'ui.officeBackToBuilding': '‹ Building',
  'ui.staffRoom': 'Staff room',
  'ui.staffRoomHint': 'Upgrades and perks for the whole company live here — grab a coffee.',
  'ui.manageFloor': 'Manage',
  'ui.hireEmployees': 'Hire',
  'ui.candidates': 'Candidates',
  'ui.newBatch': 'New batch',
  'ui.hire': 'Hire',
  'ui.offFloor': 'Off the floor ({count})',
  'ui.floorEmployees': 'Employees on this floor',
  'ui.floorProjectTitle': 'Floor project',
  'ui.contracts': 'Contracts',
  'ui.noFloorWorkers': 'Nobody works on this floor yet.',
  'ui.close': 'Close',
  'ui.musicOn': 'Music on',
  'ui.musicOff': 'Music off',
  'ui.musicVolume': 'Music volume',
  'ui.desksUsed': '{used}/{total} desks used',
  'ui.foundOnMap': 'Found new companies from the Map tab.',
  'ui.renameCostConfirm': 'Renaming costs {cash} + {coins} VsCoin. Proceed?',

  'ui.companyFounded': '{name} founded!',

  // --- International Business -----------------------------------------------
  'ui.world': 'International Business',
  'ui.worldHint':
    'Every country runs its own economy — money, teams and buildings stay local; VsCoin, missions and your story travel with you. World bonus: +{bonus}% output everywhere.',
  'ui.travel': 'Travel',
  'ui.youAreHere': 'HERE',
  'ui.freshEconomyHint': 'A fresh market — start anew, grow faster',
  'ui.countryUnlocked': 'Welcome to {name}!',

  // --- Prestige: IPO & Legacy (Stats tab) -----------------------------------
  'ui.prestigeTitle': 'IPO & Legacy',
  'ui.prestigeRep': 'Reputation',
  'ui.prestigeMult': 'Permanent output bonus',
  'ui.prestigeGain': 'Reputation if you IPO now',
  'ui.prestigeButton': 'IPO — open-source everything',
  'ui.prestigeHint':
    'IPO resets every company and country. You keep VsCoin, premium upgrades, cosmetics, your avatar and your story — and your Reputation boosts output forever.',
  'ui.prestigeLocked': 'Ship the AGI from the Orbital HQ to unlock the IPO.',
  'ui.prestigeConfirm':
    'IPO now? Every company and country restarts from the garage. VsCoin, cosmetics and Reputation are yours forever.',
  'ui.prestigeDone': 'IPO! The dream is open source — back to the garage, with a reputation.',
  'ui.prestigeNeedStory': 'Finish the dream first: ship the AGI from the Orbital HQ.',
  'ui.prestigeNoRep': 'Not enough new earnings for a single Reputation point yet.',

  // --- Story journal (Stats tab) --------------------------------------------
  'ui.storyJournal': 'Your story',
  'ui.storyJournalProgress': '{seen} / {total} chapters lived',
  'ui.storyJournalEmpty':
    'Your story is just beginning — Gabriel will note every milestone here.',

  // --- Beta reset ----------------------------------------------------------
  'ui.betaResetTitle': 'A fresh start (beta)',
  'ui.betaResetText':
    'Big remodeling: every floor now runs its own project, and prices finally match your company’s league — no more $20 desks in a trillion-dollar tower. This beta update reworks the economy from the ground up, so your old save could not come along. Thank you for testing — your next empire will rise even faster!',

  // --- Welcome back: Gabriel's offline doubler -------------------------------
  'ui.doublerButton': '×2 with Gabriel’s blessing — free',
  'ui.doublerDone': 'Gabriel doubled it: +{amount}!',
  'ui.doublerCooldown': 'Gabriel’s blessing needs to recharge — come back tomorrow.',
  'ui.doublerNothing': 'Nothing to double right now.',

  // --- Countries -----------------------------------------------------------
  'country.ch.name': 'Switzerland',
  'country.us.name': 'USA',
  'country.ca.name': 'Canada',
  'country.it.name': 'Italy',
  'country.fr.name': 'France',
  'country.de.name': 'Germany',
  'country.sa.name': 'Saudi Arabia',
  'country.cn.name': 'China',

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
  'look.portrait': 'Portrait',
  'look.portraitClassic': 'Drawn look',

  // --- Tutorial (Gabriel speaking) ----------------------------------------
  'tutorial.welcome.text':
    'Hi! I’m Gabriel, your very own angel investor — the guardian kind. You dream of building an AI that helps everyone, and I’m here to get you from this garage to the stars. Ready?',
  'tutorial.choose-country.text':
    'Every legend starts somewhere on the map. Where in the world does your garage stand?',
  'tutorial.fast-forward.text':
    'Waiting is for people without angel investors. This first fast-forward is on me — tap the ⚡ button and your trainee is back instantly. After this one, skips cost VsCoin.',
  'tutorial.name-avatar.text':
    'First things first: every great founder story needs a name on the cover. What should I call you?',
  'tutorial.name-company.text':
    'Beautiful. Now the company itself — pick a name worth printing on a rocket someday.',
  'tutorial.hire.text':
    'A company is people. Open the Office tab and tap Hire to meet your first candidates — an intern with big dreams will do just fine.',
  'tutorial.desk.text':
    'Your new hire is standing around! Nobody codes standing in a garage. Tap the floor’s 🔍 Manage button and buy them a desk.',
  'tutorial.upgrade.text':
    'Watch that progress bar go! Here — a little angel-investor gift of {gift}. Spend it in the Staff room at the top of your building; an espresso machine works miracles on output.',
  'tutorial.train.text':
    'One more founder secret: people grow. Tap 🔍 Manage on a floor and send someone to a training program from their card — they’ll come back stronger.',
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

  'story.builders-guild.title': 'The builders arrive',
  'story.builders-guild.text':
    'A second floor, on the house — and a worker to raise it, because a gift you can’t use is just clutter. Empires aren’t only coded, my friend: they’re built, hammer by hammer. Hire more builders and watch more things rise at once.',

  'story.debt-first.title': 'In the red',
  'story.debt-first.text':
    'Payday came and the account said no. Listen — every founder kisses zero at least once. But debt gathers interest like gossip gathers ears. Ship something, fast.',

  'story.debt-crisis.title': 'The exodus begins',
  'story.debt-crisis.text':
    'People believe in dreams, not IOUs. Your best folks are updating their résumés while you read this. Cut costs or cash a contract — before the office echoes.',

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

  'story.world-unlocked.title': 'The world calls',
  'story.world-unlocked.text':
    'Every building in the city bears your name. The map on your wall suddenly looks small — and the globe next to it very, very interesting. International Business is open.',

  'story.second-country.title': 'Stamped passport',
  'story.second-country.text':
    'A new country, a new garage, fifty bucks and jet lag. You’ve done this before — and this time the whole world already whispers your name. Faster, better, again.',

  'story.world-conqueror.title': 'Eight flags',
  'story.world-conqueror.text':
    'Eight countries, eight time zones, one dream. Somewhere over the ocean you realize the company stopped being a company a while ago. It’s a movement now.',

  'story.dream-achieved.title': 'Free as sunlight',
  'story.dream-achieved.text':
    'From the orbital lab, your AI now reaches everyone — every language, every timezone, free as sunlight, exactly like you promised the lawnmower. They’re not laughing anymore. They’re building garages of their own.',

  'story.new-venture.title': 'A new venture',
  'story.new-venture.text':
    'You gave the dream away, and the world thanked you by building on it — a thousand garages now run on your code. And here you are, back beside the lawnmower, by choice this time. Turns out the dream was never the exit — it was the habit of building.',
  // --- i18n sweep: chrome, buttons, tooltips, toasts ------------------------
  'ui.tab.map': 'Map',
  'ui.tab.office': 'Office',
  'ui.tab.shop': 'Shop',
  'ui.tab.vscoin': 'VsCoin',
  'ui.tab.stats': 'Stats',
  'ui.renameCompanyTitle': 'Rename company',
  'ui.activeBoostTitle': 'Active boost',
  'ui.netIncomeTitle': 'Estimated net income',
  'ui.sitesOwned': '{owned}/{total} sites owned',
  'ui.mapStyle': 'Map style',
  'ui.mapHint':
    'Tap a building to found or manage a company there. Every company works and earns at the same time — even while you’re away.',
  'ui.managing': 'MANAGING',
  'ui.managingBtn': 'Managing',
  'ui.manageCompany': 'Manage this company',
  'ui.statIncome': 'Income',
  'ui.statSiteBonus': 'Site bonus',
  'ui.statTeam': 'Team',
  'ui.teamStat': '{people} people · {desks} desks',
  'ui.statSalaries': 'Salaries',
  'ui.statOutput': 'Output',
  'ui.statFloors': 'Floors',
  'ui.statPrice': 'Price',
  'ui.contractScale': 'Contract scale',
  'ui.siteSpecialty': 'Specialty',
  'ui.foundCompanyBtn': 'Found a company — {price}',
  'ui.unlockBtn': 'Unlock {price}',
  'ui.noDesk': 'No desk — idle!',
  'ui.expTitle': 'Experience to next level',
  'ui.trainBtn': 'Train {price}',
  'ui.fireBtn': 'Fire',
  'ui.freeSlotTitle': 'Free slot — buy a workstation',
  'ui.freeSlot': 'free slot',
  'ui.emptyDesk': 'empty',
  'ui.maxHeight': 'Max height reached',
  'ui.awayTraining': 'Away at training',
  'ui.staffCount': '{count} / {cap} employees',
  'ui.hireCapBanner':
    'All {cap} desks are occupied — fire, train or promote someone first. A stronger team beats a bigger one!',
  'ui.overCapacity': 'Over capacity: {count} employees for {cap} desk slots — nobody works without a desk.',
  'error.officeAtCapacity': 'All desks are occupied — fire, train or promote someone first.',
  'ui.badgeTraining': 'Training',
  'ui.badgePromotion': 'Promotion',
  'ui.standNeedsDesk': '{name} — needs a desk!',
  'ui.standBackIn': '{name} — back in {time}',
  'ui.officeHint':
    'Tap your people to hear from them. Seating is automatic: strongest workers get the best desks. Each floor adds {slots} desk slots.',
  'ui.waitingDesk': 'Waiting for a desk (producing nothing):',
  'ui.addFloorBtn': 'Add floor {price}',
  'ui.buyWorkstations': 'Buy workstations',
  'ui.officeFullBadge': 'Office full — add a floor',
  'ui.buyBtn': 'Buy {price}',
  'ui.buyNBtn': 'Buy ×{n} {price}',
  'ui.qtyMax': 'Max',
  'ui.applied': 'Applied',
  'ui.applyHere': 'Apply here',
  'ui.isDefault': 'Default',
  'ui.setDefault': 'Set default',
  'ui.decorTitle': 'Wallpapers & decor',
  'ui.decorOwned': 'Owned — free to apply anywhere',
  'ui.decorUnlocks': 'Unlocks for every company',
  'ui.decorFollowsDefault': 'this building follows your default',
  'ui.decorFollowsOwn': 'this building has its own pick',
  'ui.followDefault': 'Follow player default instead',
  'ui.marketingName': 'Marketing Campaign',
  'ui.marketingDesc':
    '×{mult} output for {duration}, all companies. Buying again extends it.',
  'ui.launchBtn': 'Launch {price}',
  'ui.companiesReq': '{count} companies',
  'ui.stat.totalEarned': 'Total earned',
  'ui.stat.projects': 'Projects completed',
  'ui.stat.companies': 'Companies',
  'ui.stat.employees': 'Employees',
  'ui.stat.workstations': 'Workstations',
  'ui.stat.output': 'Team output (here)',
  'ui.stat.salaries': 'Salaries (all)',
  'ui.stat.timePlayed': 'Time played',
  'ui.stat.founded': 'Founded',
  'ui.settingsTitle': 'Settings',
  'ui.soundOn': 'Sound on',
  'ui.soundOff': 'Sound off',
  'ui.effectsOn': 'Effects on',
  'ui.effectsOff': 'Effects off',
  'ui.speedTitle': 'Live simulation speed',
  'ui.speedBtn': 'Speed ×{scale}',
  'ui.exportSave': 'Export save',
  'ui.importSave': 'Import save',
  'ui.resetGame': 'Reset game',
  'ui.autosaveHint':
    'Progress is saved automatically every 10 seconds and when you close the app. Your team keeps working while you’re away (up to 24h).',
  'ui.projectUnlocked': 'Project unlocked!',
  'ui.welcomeAboard': 'Welcome aboard!',
  'ui.offToWorkshop': 'Off to the workshop!',
  'ui.fireConfirm': 'Fire {name}? There is no severance package.',
  'ui.wallpaperUnlocked': 'Wallpaper unlocked!',
  'ui.newMapStyle': 'New map style!',
  'ui.campaignLive': 'Campaign live — sales are calling!',
  'ui.saveCodeCopied': 'Your save code (copied to clipboard):',
  'ui.pasteSaveCode': 'Paste your save code:',
  'ui.invalidSaveCode': 'Invalid save code',
  'ui.saveImported': 'Save imported',
  'ui.trainingComplete': 'Training complete — now Lv {level}!',
  'ui.investorLeft': 'An investor left something…',
  'ui.investorTip': 'Investor tip! 2× income for 60s',

  // --- Engine error ids (src/game returns ids only) -------------------------
  'error.notEnoughMoney': 'Not enough money',
  'error.noSuchFloor': 'No such floor',
  'error.noSuchProject': 'No such project',
  'error.projectLocked': 'Project is locked',
  'error.workerNotFound': 'Worker not found',
  'error.workerBusy': 'Already busy',
  'error.topGrade': 'Already at the top grade',
  'error.notAtCap': 'Not at the skill cap yet',
  'error.promoteInstead': 'At skill cap — promote instead',
  'error.maxSkill': 'Already at max skill level',
  'error.deskNotFound': 'Desk not found',
  'error.deskUpgrading': 'Already being upgraded',
  'error.bestDesk': 'Already the best desk',
  'error.nothingToFastForward': 'Nothing to fast-forward',
  'error.candidateNotFound': 'Candidate not found',
  'error.officeFull': 'No office space left — unlock a new floor',
  'error.maxHeight': 'Building is already at max height',
  'error.siteOccupied': 'Site already occupied',
  'error.countryUnlocked': 'Country already unlocked',
  'error.ownCityFirst': 'Own every company in your city first',
  'error.countryLocked': 'Country not unlocked',
  'error.journeyBegun': 'The journey has already begun',
  'error.invalidAmount': 'Invalid amount',
  'error.notEnoughVsCoin': 'Not enough VsCoin',
  'error.tooManyBoosts': 'Too many active boosts',
  'error.invalidBoost': 'Invalid boost',
  'error.invalidSpeed': 'Invalid speed',
  'error.unknownLanguage': 'Unknown language',
  'error.alreadyOwned': 'Already owned',
  'error.wallpaperNotOwned': 'Wallpaper not owned',
  'error.mapThemeNotOwned': 'Map theme not owned',
  'error.emptyName': 'Name cannot be empty',
  'error.companyNotFound': 'Company not found',
  'error.alreadyUnlocked': 'Already unlocked',
  'error.maxLevel': 'Already at max level',
  'error.noStory': 'No story to dismiss',
  'error.missionClaimed': 'Mission already claimed',
  'error.missionIncomplete': 'Mission not completed yet',
  'error.tutorialOver': 'Tutorial is already over',
  'error.stepUnfinished': 'Step not finished yet',
  'error.noSuchContract': 'No such contract',
  'error.alreadyClaimed': 'Already claimed',
  'error.contractUnfinished': 'Contract not finished yet',

  // --- Worker traits --------------------------------------------------------
  'ui.rareBadge': 'RARE',
  'trait.night-owl.name': 'Night owl',
  'trait.night-owl.desc': 'Ships while the city sleeps: +15% output.',
  'trait.coffee-addict.name': 'Coffee addict',
  'trait.coffee-addict.desc': 'Runs on espresso: +25% output, +10% salary.',
  'trait.quick-study.name': 'Quick study',
  'trait.quick-study.desc': 'Learns fast: +50% experience gain.',
  'trait.frugal.name': 'Frugal',
  'trait.frugal.desc': 'Negotiates modestly: −15% salary.',
  'trait.perfectionist.name': 'Perfectionist',
  'trait.perfectionist.desc': 'Polishes everything: +10% output, −15% experience gain.',
  'trait.rockstar.name': 'Rockstar',
  'trait.rockstar.desc': 'A legend in the making: +40% output, +25% salary.',

  // --- Random events --------------------------------------------------------
  'ui.eventKicker': 'Opportunity',
  'ui.eventAccept': 'Deal!',
  'ui.eventDecline': 'Pass',
  'ui.eventAccepted': 'Deal closed!',
  'event.investor-offer.title': 'An investor calls',
  'event.investor-offer.text':
    'They wire you {cash} on the spot — if everyone’s salary doubles for {duration}. Deal?',
  'event.press-coverage.title': 'A journalist wants the story',
  'event.press-coverage.text':
    'Sponsor the feature for {cash} and the buzz doubles your output for {duration}.',
  'event.crunch-pizza.title': 'Pizza-fueled crunch night',
  'event.crunch-pizza.text':
    'Order pizza for the whole floor ({cash}): ×{mult} output, but ×{salaryMult} salaries for {duration}.',
  'event.conference-keynote.title': 'A keynote slot opens up',
  'event.conference-keynote.text':
    'Pay {cash} for the slot and the demo blows minds: ×{mult} output for {duration}.',

  // --- Piggy vault ----------------------------------------------------------
  'ui.vaultTitle': 'Piggy vault',
  'ui.vaultFull': 'FULL',
  'ui.vaultOpen': 'Crack it open',
  'ui.vaultOpened': 'Vault cracked — enjoy the windfall!',
  'ui.vaultHint':
    'Every project payout drops an extra {rate}% in here. It fills up to two hours of income — crack it whenever you like.',
  'error.vaultEmpty': 'The vault is empty — earn something first.',

  // --- Office pets ----------------------------------------------------------
  'ui.petsTitle': 'Pet corner',
  'ui.petHint': 'A zero-power companion for your floors.',
  'ui.petAdopt': 'Bring it here',
  'ui.petHere': 'Lives here',
  'ui.petDismiss': 'Send the pet home',
  'ui.petAdopted': 'New office companion adopted!',
  'error.petNotOwned': 'You don’t own that pet yet.',
} as const;
