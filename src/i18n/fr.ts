import type { en } from './en';

/**
 * French string table. The type constraint guarantees every English key
 * exists here — `npm run build` fails on a missing or extra key.
 */
export const fr: Record<keyof typeof en, string> = {
  // --- UI chrome -----------------------------------------------------------
  'ui.continue': 'Continuer',
  'ui.next': 'Suivant',
  'ui.skipTutorial': 'Passer le tutoriel',
  'ui.gabriel': 'Gabriel',
  'ui.storyTitle': 'Votre histoire',
  'ui.language': 'Langue',
  'ui.build': 'Version',
  'ui.lang.auto': 'Auto',
  'ui.lang.en': 'English',
  'ui.lang.fr': 'Français',
  'ui.namePlaceholder': 'Votre nom',
  'ui.companyPlaceholder': 'Nom de la société',
  'ui.confirm': 'C’est parti !',
  'ui.tutorialStep': 'Étape {step} / {total}',

  // --- Missions & VsCoin ---------------------------------------------------
  'ui.missions': 'Missions',
  'ui.claim': 'Réclamer',
  'ui.claimed': 'VsCoin gagnés !',
  'ui.vsCoinShop': 'Boutique VsCoin',
  'ui.vsCoinShopHint':
    'Les VsCoin se gagnent en accomplissant des missions et en vivant votre histoire — dépensez-les en exclusivités.',
  'ui.vsCoinBoost': 'Sprint doré — production ×{mult} pendant {duration}',
  'ui.vsCoinBoostBought': 'Sprint doré activé !',
  'ui.buyFor': 'Acheter pour {price}',
  'mission.projectsCompleted': 'Terminez {target} projets',
  'mission.totalEarned': 'Gagnez {target} au total',
  'mission.workers': 'Employez {target} personnes',
  'mission.companies': 'Possédez {target} sociétés',
  'mission.upgradeLevels': 'Achetez {target} niveaux d’amélioration',
  'mission.desks': 'Possédez {target} postes de travail',
  'mission.promotions': 'Promouvez des employés {target} fois',
  'mission.countries': 'Implantez-vous dans {target} pays',

  // --- Employés : formation, promotion, avance rapide ----------------------
  'ui.inTraining': 'En formation · +{levels} niveaux dans {time}',
  'ui.inPromotion': 'Promotion en {title} · terminée dans {time}',
  'ui.promote': 'Promouvoir',
  'ui.promotionStarted': 'Stage de leadership lancé !',
  'ui.promoted': 'Promotion terminée !',
  'ui.maxGrade': 'Sommet de l’échelle',
  'ui.fastForwarded': 'Terminé — le temps, c’est de l’argent !',
  'ui.free': 'Gratuit',
  'ui.workerQuit': '{name} a démissionné pour salaires impayés !',

  // --- Ouvriers (code : builders — affichés « Ouvriers ») -------------------
  'ui.builders': 'Ouvriers',
  'ui.buildersFree': '{free}/{total} disponibles',
  'ui.hireBuilder': 'Embaucher un ouvrier',
  'ui.builderGiftName': 'Gérard Fondations',
  'ui.builderGiftHint':
    'Votre équipe de chantier construit les étages, rénove les bureaux et anime les formations. {name} — votre premier ouvrier — est un cadeau de Gabriel.',
  'error.noFreeBuilders':
    'Tous les ouvriers sont occupés — attendez la fin d’un chantier ou embauchez-en un autre.',

  // --- Construction d’étages ------------------------------------------------
  'ui.floorBuilding': 'Étage {floor} en construction · terminé dans {time}',
  'ui.floorBuildingShort': 'En construction',
  'ui.builderOnSite': '1 ouvrier sur le chantier',
  'ui.floorBuildStarted': 'Chantier lancé !',
  'ui.floorBuilt': 'Nouvel étage prêt !',
  'ui.floorGift': 'Réclamer le cadeau de Gabriel : un 2ᵉ étage gratuit',
  'ui.floorGiftClaimed': 'Gabriel vous a construit un étage — avec une avance rapide gratuite !',
  'error.floorAlreadyBuilding': 'Un étage est déjà en construction.',
  'error.floorGiftUnavailable': 'Le cadeau de Gabriel n’est pas disponible ici.',

  // --- Fondation de sociétés ------------------------------------------------
  'ui.siteBuilding': 'En construction · ouverture dans {time}',
  'ui.companyBuildStarted': 'Équipe de chantier envoyée !',
  'ui.companyBuilt': '{name} ouvre ses portes !',
  'error.siteAlreadyBuilding': 'Une société est déjà en construction à cet endroit.',

  // --- Boutique (levées de fonds : VsCoin → cash) ---------------------------
  'ui.shopTitle': 'Levées de fonds',
  'ui.shopHint':
    'Échangez des VsCoin contre une injection de cash dans le pays que vous gérez. La valeur des packs suit vos revenus actuels : une levée reste utile à chaque étape.',
  'ui.shopDebtNote':
    'Vous êtes endetté : les fonds levés remboursent d’abord la dette — c’est le même portefeuille.',
  'ui.packRequires': 'Nécessite {count} sociétés',
  'ui.packBought': '{name} : c’est bouclé — {cash} virés !',
  'shop.pack.seed.name': 'Tour Seed',
  'shop.pack.seed.blurb': 'Un business angel bienveillant vous vire un peu de trésorerie.',
  'shop.pack.series-a.name': 'Série A',
  'shop.pack.series-a.blurb': 'Une vraie term sheet. Les associés veulent une démo.',
  'shop.pack.series-b.name': 'Série B',
  'shop.pack.series-b.blurb': 'Du capital de croissance — le board deck s’écrit tout seul.',
  'shop.pack.series-c.name': 'Série C',
  'shop.pack.series-c.blurb': 'De l’argent late-stage. Des jets privés tournent autour du pâté de maisons.',
  'shop.pack.ipo.name': 'Cloche d’IPO',
  'shop.pack.ipo.blurb': 'Sonnez-la. Le marché fait le reste.',

  // --- Onglet d’acquisition de VsCoin ---------------------------------------
  'ui.vscoinTitle': 'Obtenir des VsCoin',
  'ui.vscoinHint':
    'Les VsCoin paient les avances rapides, les ouvriers, les levées de fonds et les bonus premium. Vous en gagnez aussi via les missions et votre histoire.',
  'ui.betaBadge': 'BÊTA',
  'ui.claimFree': 'Récupérer gratuitement',
  'ui.vscoinClaimed': '+{coins} VsCoin — profitez-en !',
  'ui.comingSoon': 'Disponible avec la monétisation',
  'ui.vscoinBetaNote':
    'Pendant la bêta, le pack de départ est gratuit et illimité — sans conditions.',
  'error.iapComingSoon':
    'Les vrais achats arriveront après la bêta — le pack de départ est offert !',
  'vscoin.pack.vsc-starter.name': 'Espresso de départ',
  'vscoin.pack.vsc-angel.name': 'Ailes d’ange',
  'vscoin.pack.vsc-venture.name': 'Coffre venture',
  'vscoin.pack.vsc-growth.name': 'Fusée de croissance',
  'vscoin.pack.vsc-unicorn.name': 'Trésor de licorne',

  // --- Améliorations de bureaux ---------------------------------------------
  'ui.renovations': 'Rénovations',
  'ui.upgradeDesk': 'Améliorer',
  'ui.deskUpgrading': 'En rénovation · terminé dans {time}',
  'ui.deskUpgradeStarted': 'Rénovation lancée !',

  // --- Missions UX ----------------------------------------------------------
  'ui.missionComplete': 'Mission accomplie — réclamez vos VsCoin !',

  // --- Sociétés : plafonds, créneaux, renommage ------------------------------
  'ui.softCap': 'PLAFOND',
  'ui.softCapHint':
    'Ce contrat a atteint son plafond ici — une société plus grande ira plus loin.',
  'ui.projectSlots': 'Créneaux de projets',
  'ui.projectSlotsHint':
    'Affectez les étages supérieurs à leurs propres projets — ou gardez tout le monde sur le principal.',
  'ui.unlockSlot': 'Débloquer une seconde équipe',
  'ui.slotNeedsFloors': 'Nécessite {floors} étages',
  'ui.slotUnlocked': 'Nouveau créneau de projet débloqué !',
  'ui.mainProject': 'Projet principal',
  'ui.renameCostConfirm': 'Renommer coûte {cash} + {coins} VsCoin. Continuer ?',

  'ui.companyFounded': '{name} est fondée !',

  // --- International Business -----------------------------------------------
  'ui.world': 'International Business',
  'ui.worldHint':
    'Chaque pays a sa propre économie — l’argent, les équipes et les immeubles restent locaux ; les VsCoin, les missions et votre histoire voyagent avec vous. Bonus mondial : +{bonus}% de production partout.',
  'ui.travel': 'Voyager',
  'ui.youAreHere': 'ICI',
  'ui.freshEconomyHint': 'Un marché vierge — repartez de zéro, grandissez plus vite',
  'ui.countryUnlocked': 'Nouvelle destination : {name} !',

  // --- Prestige : IPO & Héritage (onglet Stats) ------------------------------
  'ui.prestigeTitle': 'IPO & Héritage',
  'ui.prestigeRep': 'Réputation',
  'ui.prestigeMult': 'Bonus de production permanent',
  'ui.prestigeGain': 'Réputation si vous entrez en bourse maintenant',
  'ui.prestigeButton': 'IPO — tout passer en open source',
  'ui.prestigeHint':
    'L’IPO réinitialise toutes les sociétés et tous les pays. Vous gardez vos VsCoin, vos améliorations premium, vos cosmétiques, votre avatar et votre histoire — et votre Réputation dope la production pour toujours.',
  'ui.prestigeLocked': 'Livrez l’IAG depuis le QG orbital pour débloquer l’IPO.',
  'ui.prestigeConfirm':
    'Entrer en bourse maintenant ? Toutes les sociétés et tous les pays repartent du garage. VsCoin, cosmétiques et Réputation sont à vous pour toujours.',
  'ui.prestigeDone': 'IPO ! Le rêve est open source — retour au garage, avec une réputation.',
  'ui.prestigeNeedStory': 'Terminez d’abord le rêve : livrez l’IAG depuis le QG orbital.',
  'ui.prestigeNoRep': 'Pas encore assez de nouveaux gains pour un seul point de Réputation.',

  // --- Réinitialisation bêta ------------------------------------------------
  'ui.betaResetTitle': 'Un nouveau départ (bêta)',
  'ui.betaResetText':
    'Les équipes de chantier sont arrivées : des ouvriers qui construisent vos étages et vos sociétés au fil du temps, des levées de fonds et une boutique VsCoin. Cette mise à jour bêta repense la croissance de votre empire, et votre ancienne sauvegarde n’a pas pu suivre. Merci de tester — votre prochain empire grandira encore plus vite !',

  // --- Pays -----------------------------------------------------------------
  'country.ch.name': 'Suisse',
  'country.us.name': 'États-Unis',
  'country.ca.name': 'Canada',
  'country.it.name': 'Italie',
  'country.fr.name': 'France',
  'country.de.name': 'Allemagne',
  'country.sa.name': 'Arabie saoudite',
  'country.cn.name': 'Chine',

  // --- Bureau du fondateur & personnalisation ------------------------------
  'ui.founderOffice': 'Bureau du fondateur',
  'ui.customize': 'Personnaliser',
  'ui.done': 'Terminé',
  'ui.renameAvatar': 'Changer de nom',
  'look.skin': 'Peau',
  'look.hair': 'Couleur de cheveux',
  'look.hairstyle': 'Coiffure',
  'look.eyeStyle': 'Yeux',
  'look.mouthStyle': 'Bouche',
  'look.facialHair': 'Pilosité',
  'look.outfit': 'Tenue',
  'look.accessory': 'Accessoire',
  'look.portrait': 'Portrait',
  'look.portraitClassic': 'Look dessiné',

  // --- Tutoriel (Gabriel parle) -------------------------------------------
  'tutorial.welcome.text':
    'Salut ! Moi c’est Gabriel, ton investisseur providentiel — au sens littéral. Tu rêves d’une IA qui aide tout le monde, et je suis là pour te mener de ce garage jusqu’aux étoiles. On y va ?',
  'tutorial.choose-country.text':
    'Toute légende commence quelque part sur la carte. Où dans le monde se trouve ton garage ?',
  'tutorial.fast-forward.text':
    'Attendre, c’est pour les gens sans investisseur providentiel. Cette première avance rapide est pour moi — appuie sur le bouton ⚡ et ta recrue revient instantanément. Après celle-ci, chaque saut coûte des VsCoin.',
  'tutorial.name-avatar.text':
    'Commençons par le commencement : toute grande histoire de fondateur a un nom sur la couverture. Comment dois-je t’appeler ?',
  'tutorial.name-company.text':
    'Magnifique. Maintenant, la société elle-même — choisis un nom digne d’être peint sur une fusée un jour.',
  'tutorial.hire.text':
    'Une entreprise, c’est des gens. Ouvre l’onglet Team et recrute ta première personne — un stagiaire avec de grands rêves fera parfaitement l’affaire.',
  'tutorial.desk.text':
    'Ta nouvelle recrue attend debout ! Personne ne code debout dans un garage. Va dans l’onglet Office et achète-lui un bureau.',
  'tutorial.upgrade.text':
    'Regarde cette barre de progression avancer ! Tiens — un petit cadeau d’ange investisseur de {gift}. Dépense-le dans l’onglet Upgrades ; une machine à espresso fait des miracles.',
  'tutorial.train.text':
    'Un dernier secret de fondateur : les gens grandissent. Dans l’onglet Team, envoie quelqu’un en formation — il reviendra plus fort.',
  'tutorial.outro.text':
    'Tu sais tout. Livre des projets, agrandis l’équipe, fonde de nouvelles sociétés sur la carte — et ne perds jamais le rêve de vue. Je repasserai te voir en chemin !',

  // --- Fil narratif (le rêve de l’IAG) -------------------------------------
  'story.dawn.title': 'Un garage et un rêve',
  'story.dawn.text':
    'Tout le monde a ri quand tu l’as dit à voix haute : une IA qui aide vraiment tout le monde, gratuite comme la lumière du soleil. Laisse-les rire. Les rêves de cette taille commencent toujours entre une tondeuse et une planche de surf.',

  'story.first-hire.title': 'La première personne à y croire',
  'story.first-hire.text':
    'Quelqu’un a lu ta petite annonce et a dit oui. Un bureau, deux rêveurs — statistiquement, ta culture d’entreprise vient de doubler.',

  'story.first-payout.title': 'Premier argent encaissé',
  'story.first-payout.text':
    'Un client a vraiment payé ! Ce n’est pas une question d’argent — c’est la piste de décollage que cet argent offre au rêve. Mais bon, c’est aussi un petit peu une question d’argent.',

  'story.first-thousand.title': 'Mille dollars honnêtes',
  'story.first-thousand.text':
    'Le premier millier est le plus dur, paraît-il. Tu l’as gagné une landing page à la fois. L’IA de tes rêves n’existe pas encore — mais son compte en banque, si.',

  'story.full-garage.title': 'Une vraie équipe',
  'story.full-garage.text':
    'Quatre personnes se faufilent chaque matin entre la tondeuse et les cartons. Le garage sent le café et l’ambition. Ce n’est officiellement plus un passe-temps.',

  'story.first-upgrade.title': 'Investir dans l’équipe',
  'story.first-upgrade.text':
    'Tu as dépensé pour ton équipe plutôt que pour toi. Retiens cette sensation — c’est exactement l’habitude qui bâtit des entreprises dignes de confiance.',

  'story.debt-first.title': 'Dans le rouge',
  'story.debt-first.text':
    'Le jour de paie est arrivé et le compte a dit non. Écoute — tout fondateur frôle le zéro au moins une fois. Mais la dette accumule les intérêts comme les ragots accumulent les oreilles. Livre quelque chose, vite.',

  'story.debt-crisis.title': 'L’exode commence',
  'story.debt-crisis.text':
    'Les gens croient aux rêves, pas aux reconnaissances de dette. Tes meilleurs éléments mettent à jour leur CV pendant que tu lis ceci. Réduis les coûts ou encaisse un contrat — avant que le bureau ne résonne.',

  'story.hundred-k.title': 'Six chiffres',
  'story.hundred-k.text':
    'Cent mille dollars, gagnés en livrant de vraies choses. Les investisseurs commencent à te rappeler. Certains prononcent même ton nom correctement.',

  'story.site-loft.title': 'Adieu, garage',
  'story.site-loft.text':
    'Une deuxième société, dans un vrai loft avec de vraies briques apparentes. Tu as gardé le garage, évidemment. Les empires se souviennent d’où ils sont nés.',

  'story.site-paloalto.title': 'Palo Alto',
  'story.site-paloalto.text':
    'Trois sociétés. Ton bureau de Palo Alto est à deux pas des gens qui t’ont dit non l’an dernier. Tu les salues chaque matin. Gentiment.',

  'story.ten-million.title': 'Dix millions',
  'story.ten-million.text':
    'Le chiffre ne semble plus réel, alors tu as scotché une photo du vieux garage sur ton écran. Le rêve garde la même taille, même quand l’argent n’en a plus.',

  'story.site-campus.title': 'Le campus',
  'story.site-campus.text':
    'Des capsules de sieste, des repas gratuits, un mur d’escalade que personne n’utilise. Surtout : des centaines de bureaux tournés vers le même rêve. Tu recrutes des gens bienveillants. Ça se voit.',

  'story.site-tower.title': 'La skyline',
  'story.site-tower.text':
    'Ton logo se voit depuis deux ponts. Quelque part en bas, quelqu’un dans un garage pointe ta tour en disant « un jour ». Tu sais exactement ce qu’il ressent.',

  'story.one-billion.title': 'Le mot en M',
  'story.one-billion.text':
    'Un milliard de dollars gagnés. Les magazines veulent l’histoire du yacht ; tu leur redonnes la même réponse ennuyeuse : tout part dans le labo. Ils ne l’impriment jamais.',

  'story.site-seattle.title': 'Cap au nord, vers les nuages',
  'story.site-seattle.text':
    'Seattle : la pluie dehors, des serveurs dedans. Ton campus cloud ronronne jour et nuit — le rêve demande plus de calcul que la Californie n’a de toits.',

  'story.site-nyc.title': 'Le hub Flatiron',
  'story.site-nyc.text':
    'Wall Street rencontre ton changelog. New York apporte au rêve ce que la Valley ne pouvait pas : des gens qui demandent « pourquoi ? » à chaque réunion. Tu embauches les plus bruyants.',

  'story.agi-unlocked.title': 'Le Labo ouvre',
  'story.agi-unlocked.text':
    'Le laboratoire de recherche en IAG est réel. Des tableaux blancs partout, des machines à café à bout de souffle. Chaque projet livré jusqu’ici n’était qu’un entraînement secret pour celui-là.',

  'story.agi-shipped.title': 'Ça marche',
  'story.agi-shipped.text':
    'À 3 h 12 du matin, le labo est devenu silencieux, puis très bruyant. Elle a répondu. Elle a aidé. Elle était bienveillante — parce que tu l’as construite ainsi. Maintenant, le monde doit la rencontrer.',

  'story.site-orbital.title': 'QG orbital',
  'story.site-orbital.text':
    'Zéro gravité, zéro distraction. De là-haut, la planète n’a aucune frontière — ça tombe bien, ton IA n’a jamais été conçue pour s’arrêter à l’une d’elles.',

  'story.world-unlocked.title': 'Le monde appelle',
  'story.world-unlocked.text':
    'Chaque immeuble de la ville porte ton nom. La carte au mur paraît soudain petite — et le globe juste à côté très, très intéressant. L’International Business est ouvert.',

  'story.second-country.title': 'Passeport tamponné',
  'story.second-country.text':
    'Un nouveau pays, un nouveau garage, cinquante dollars et le décalage horaire. Tu l’as déjà fait — et cette fois, le monde entier murmure déjà ton nom. Plus vite, plus fort, encore.',

  'story.world-conqueror.title': 'Huit drapeaux',
  'story.world-conqueror.text':
    'Huit pays, huit fuseaux horaires, un seul rêve. Quelque part au-dessus de l’océan, tu réalises que la société a cessé d’être une société depuis longtemps. C’est un mouvement, maintenant.',

  'story.dream-achieved.title': 'Gratuite comme la lumière',
  'story.dream-achieved.text':
    'Depuis le labo orbital, ton IA touche désormais tout le monde — toutes les langues, tous les fuseaux, gratuite comme la lumière du soleil, exactement comme promis à la tondeuse. Ils ne rient plus. Ils montent leurs propres garages.',

  'story.new-venture.title': 'Une nouvelle aventure',
  'story.new-venture.text':
    'Tu as offert le rêve au monde, et le monde t’a remercié en construisant dessus — mille garages tournent désormais sur ton code. Et te revoilà à côté de la tondeuse, par choix cette fois. Finalement, le rêve n’a jamais été l’exit — c’était l’habitude de construire.',
};
