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

  // --- Bon retour : rapport hors-ligne détaillé ------------------------------
  'ui.welcomeBackTitle': 'Bon retour !',
  'ui.welcomeBackAway': 'Pendant votre absence de {time}, votre équipe a continué à livrer :',
  'ui.offlineCapNote': 'La progression hors ligne couvre les premières {cap} d’une absence.',
  'ui.animationsOn': 'Animations activées',
  'ui.animationsOff': 'Animations désactivées',
  'ui.floatsOn': 'Nombres flottants activés',
  'ui.floatsOff': 'Nombres flottants désactivés',
  'ui.season.stable': 'Marché stable',
  'ui.season.boom': 'Boom : {spec}',
  'ui.season.crunch': 'Crise',
  'ui.season.recovery': 'Reprise',
  'ui.seasonTitle': 'Saison du marché — change dans {time}',
  'ui.milestonesHint': 'Paliers de possession : les nombres de bureaux et d’employés accordent des bonus de production par paliers.',
  'ui.milestoneDesks': 'Bureaux',
  'ui.milestoneTeam': 'Équipe',
  'ui.milestoneNext': '+{bonus}% à {step}',
  'ui.milestoneMaxed': 'Tous les paliers atteints',
  'ui.automationTitle': 'Automatisation',
  'ui.automationHint':
    'Gagnée en jouant (ou débloquée en avance avec des VsCoins), puis activée par entreprise. L’automatisation garde une réserve de trésorerie et un ouvrier libre, et ne promeut jamais personne.',
  'ui.autoTrain': 'Formation auto',
  'ui.autoTrainDesc': 'Relance la formation de quiconque est sous son plafond de compétence.',
  'ui.autoHire': 'Embauche auto',
  'ui.autoHireDesc': 'Accepte un candidat abordable dès qu’un bureau est libre.',
  'ui.autoDesks': 'Bureaux auto',
  'ui.autoDesksDesc': 'Achète les bureaux rentabilisés en moins de 30 minutes.',
  'ui.autoOn': 'Activé',
  'ui.autoOff': 'Désactivé',
  'ui.autoUnlocked': 'Automatisation débloquée !',
  'ui.recruiterTitle': 'Bureau de recrutement',
  'ui.recruiterLevel': 'Recruteurs — niveau {level}',
  'ui.recruiterIdle': 'Pas encore de recruteurs : 3 candidats, renouvelés à la demande.',
  'ui.recruiterStatus': 'Vivier de {cap} candidats, un nouveau toutes les {time}.',
  'ui.recruiterHired': 'Capacité de recrutement élargie !',
  'ui.maxLevel': 'Au maximum',
  'error.autoLocked': 'Cette automatisation est encore verrouillée.',
  'ui.scoutBtn': 'Explorer {price}',
  'ui.scoutHint': 'Envoyer une expédition d’étude de marché ({time}).',
  'ui.scoutingUnderway': 'Expédition en cours…',
  'ui.scoutStarted': 'L’expédition vers {name} est en route !',
  'ui.scoutFirstTitle': 'Explorez d’abord ce marché.',
  'ui.marketReport': 'Étude de marché en main — +{bonus}% de production globale.',
  'ui.marketReportBack': 'L’étude de marché {name} est arrivée !',
  'error.alreadyScouted': 'Ce marché est déjà exploré.',
  'error.expeditionRunning': 'Une expédition y est déjà en route.',
  'error.scoutFirst': 'Explorez d’abord ce marché avec une expédition.',
  'ui.viralTitle': 'Un post devient viral — attrapez-le !',
  'ui.viralCaught': 'Vague virale ! Les commandes affluent.',
  'ui.viralJackpot': 'Méga-viral ! +1 VsCoin.',
  'ui.backToWork': 'Au travail',
  'ui.awayProjects': 'Projets livrés',
  'ui.awayTrainings': 'Formations terminées',
  'ui.awayPromotions': 'Promotions obtenues',
  'ui.awayDeskUpgrades': 'Rénovations de bureaux terminées',
  'ui.awayFloors': 'Étages construits',
  'ui.awayCompanies': 'Sociétés ouvertes',
  'ui.awayQuits': 'Employés démissionnaires',

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
  'mission.builders': 'Agrandissez votre équipe de chantier à {target} ouvriers',

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
  'ui.dailyTitle': 'Contrats du jour',
  'ui.dailyHint':
    'Trois nouveaux contrats chaque jour — seuls les progrès du jour comptent. Revenez demain pour un nouveau tableau !',

  // --- Puce d’objectif (prochaine action conseillée sous le HUD) --------------
  // Les chaînes goal.* s’insèrent au milieu de goalNext/goalSave : elles
  // commencent en minuscule dans toutes les langues.
  'ui.goalNext': 'Prochaine étape : {goal} — {cost}',
  'ui.goalSave': 'Économisez {cost} → {goal}',
  'ui.goal.hire': 'recruter un nouvel employé',
  'ui.goal.desk': 'acheter un poste de travail',
  'ui.goal.unlockProject': 'débloquer {name}',
  'ui.goal.upgrade': 'acheter {name}',
  'ui.goal.floor': 'ajouter un étage',
  'ui.goal.country': 's’implanter dans un nouveau pays',
  'ui.goal.company': 'fonder une société ({name})',

  // --- Sociétés : plafonds, créneaux, renommage ------------------------------
  'ui.softCap': 'PLAFOND',
  'ui.softCapHint':
    'Ce contrat a atteint son plafond ici — une société plus grande ira plus loin.',
  'ui.projectSlotsHint':
    'Chaque étage a son propre créneau de projet — donnez à chaque étage son contrat, ou gardez tout le monde sur le principal.',
  'ui.mainProject': 'Projet principal',
  'ui.groundFloor': 'Rez-de-chaussée',
  'ui.floorN': 'Étage {floor}',

  // --- Onglet Bureau : sociétés → bâtiment → étage --------------------------
  'ui.officeCompanies': 'Vos sociétés',
  'ui.officeAllCompanies': '‹ Toutes les sociétés',
  'ui.officeBackToBuilding': '‹ Bâtiment',
  'ui.staffRoom': 'Salle de pause',
  'ui.staffRoomHint':
    'Les améliorations et avantages de toute la société vivent ici — prenez un café.',
  'ui.manageFloor': 'Gérer',
  'ui.hireEmployees': 'Recruter',
  'ui.candidates': 'Candidats',
  'ui.newBatch': 'Nouvelle fournée',
  'ui.hire': 'Embaucher',
  'ui.offFloor': 'Hors plateau ({count})',
  'ui.floorEmployees': 'Employés de cet étage',
  'ui.floorProjectTitle': 'Projet de l’étage',
  'ui.contracts': 'Contrats',
  'ui.noFloorWorkers': 'Personne ne travaille encore à cet étage.',
  'ui.close': 'Fermer',
  'ui.musicOn': 'Musique activée',
  'ui.musicOff': 'Musique coupée',
  'ui.musicVolume': 'Volume musique',
  'ui.desksUsed': '{used}/{total} bureaux occupés',
  'ui.foundOnMap': 'Fondez de nouvelles sociétés depuis l’onglet Carte.',
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

  // --- Journal de l’histoire (onglet Stats) ----------------------------------
  'ui.storyJournal': 'Votre histoire',
  'ui.storyJournalProgress': '{seen} / {total} chapitres vécus',
  'ui.storyJournalEmpty':
    'Votre histoire ne fait que commencer — Gabriel notera ici chaque étape marquante.',

  // --- Réinitialisation bêta ------------------------------------------------
  'ui.betaResetTitle': 'Un nouveau départ (bêta)',
  'ui.betaResetText':
    'Grand réaménagement : chaque étage mène désormais son propre projet, et les prix sont enfin à la hauteur de votre société — fini les bureaux à 20 $ dans une tour à mille milliards. Cette mise à jour bêta repense l’économie de fond en comble, et votre ancienne sauvegarde n’a pas pu suivre. Merci de tester — votre prochain empire grandira encore plus vite !',

  // --- Bon retour : le doubleur de Gabriel ------------------------------------
  'ui.doublerButton': '×2 avec la bénédiction de Gabriel — gratuit',
  'ui.doublerDone': 'Gabriel a doublé la mise : +{amount} !',
  'ui.doublerCooldown': 'La bénédiction de Gabriel doit se recharger — revenez demain.',
  'ui.doublerNothing': 'Rien à doubler pour le moment.',

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
    'Une entreprise, c’est des gens. Ouvre l’onglet Bureau et appuie sur « Recruter » pour rencontrer tes premiers candidats — un stagiaire avec de grands rêves fera parfaitement l’affaire.',
  'tutorial.desk.text':
    'Ta nouvelle recrue attend debout ! Personne ne code debout dans un garage. Appuie sur le bouton 🔍 « Gérer » de l’étage et achète-lui un bureau.',
  'tutorial.upgrade.text':
    'Regarde cette barre de progression avancer ! Tiens — un petit cadeau d’ange investisseur de {gift}. Dépense-le dans la Salle de pause tout en haut de ton immeuble ; une machine à espresso fait des miracles.',
  'tutorial.train.text':
    'Un dernier secret de fondateur : les gens grandissent. Appuie sur 🔍 « Gérer » sur un étage et envoie quelqu’un en formation depuis sa fiche — il reviendra plus fort.',
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

  'story.builders-guild.title': 'Les bâtisseurs arrivent',
  'story.builders-guild.text':
    'Un deuxième étage, offert par la maison — et un ouvrier pour le monter, parce qu’un cadeau qu’on ne peut pas utiliser n’est qu’un encombrant. Les empires ne se codent pas seulement, mon ami : ils se bâtissent, coup de marteau après coup de marteau. Embauche d’autres bâtisseurs et regarde plusieurs choses s’élever à la fois.',

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

  // --- Balayage i18n : chrome, boutons, infobulles, toasts ------------------
  'ui.tab.map': 'Carte',
  'ui.tab.office': 'Bureau',
  'ui.tab.shop': 'Boutique',
  'ui.tab.vscoin': 'VsCoin',
  'ui.tab.stats': 'Stats',
  'ui.renameCompanyTitle': 'Renommer la société',
  'ui.activeBoostTitle': 'Bonus actif',
  'ui.netIncomeTitle': 'Revenu net estimé',
  'ui.sitesOwned': '{owned}/{total} sites acquis',
  'ui.mapStyle': 'Style de carte',
  'ui.mapHint':
    'Touchez un bâtiment pour y fonder ou gérer une société. Toutes vos sociétés travaillent et gagnent en même temps — même en votre absence.',
  'ui.managing': 'EN GESTION',
  'ui.managingBtn': 'En gestion',
  'ui.manageCompany': 'Gérer cette société',
  'ui.statIncome': 'Revenus',
  'ui.statSiteBonus': 'Bonus du site',
  'ui.statTeam': 'Équipe',
  'ui.teamStat': '{people} personnes · {desks} bureaux',
  'ui.statSalaries': 'Salaires',
  'ui.statOutput': 'Production',
  'ui.statFloors': 'Étages',
  'ui.statPrice': 'Prix',
  'ui.contractScale': 'Échelle des contrats',
  'ui.siteSpecialty': 'Spécialité',
  'ui.foundCompanyBtn': 'Fonder une société — {price}',
  'ui.unlockBtn': 'Débloquer {price}',
  'ui.noDesk': 'Sans bureau — inactif !',
  'ui.expTitle': 'Expérience jusqu’au niveau suivant',
  'ui.trainBtn': 'Former {price}',
  'ui.fireBtn': 'Licencier',
  'ui.freeSlotTitle': 'Emplacement libre — achetez un poste de travail',
  'ui.freeSlot': 'libre',
  'ui.emptyDesk': 'vide',
  'ui.maxHeight': 'Hauteur maximale atteinte',
  'ui.awayTraining': 'En formation',
  'ui.staffCount': '{count} / {cap} employés',
  'ui.hireCapBanner':
    'Les {cap} bureaux sont tous occupés — licenciez, formez ou promouvez quelqu’un d’abord. Une équipe plus forte vaut mieux qu’une équipe plus grande !',
  'ui.overCapacity': 'Sur-effectif : {count} employés pour {cap} bureaux — personne ne travaille sans bureau.',
  'error.officeAtCapacity': 'Tous les bureaux sont occupés — licenciez, formez ou promouvez quelqu’un d’abord.',
  'ui.badgeTraining': 'Formation',
  'ui.badgePromotion': 'Promotion',
  'ui.standNeedsDesk': '{name} — attend un bureau !',
  'ui.standBackIn': '{name} — de retour dans {time}',
  'ui.officeHint':
    'Touchez vos employés pour les entendre. Le placement est automatique : les meilleurs employés obtiennent les meilleurs bureaux. Chaque étage ajoute {slots} emplacements.',
  'ui.waitingDesk': 'En attente d’un bureau (aucune production) :',
  'ui.addFloorBtn': 'Ajouter un étage {price}',
  'ui.buyWorkstations': 'Acheter des postes de travail',
  'ui.officeFullBadge': 'Bureau complet — ajoutez un étage',
  'ui.buyBtn': 'Acheter {price}',
  'ui.paybackIn': 'Rentabilisé en {time} (au rythme actuel)',
  'ui.buyNBtn': 'Acheter ×{n} {price}',
  'ui.qtyMax': 'Max',
  'ui.applied': 'Appliqué',
  'ui.applyHere': 'Appliquer ici',
  'ui.isDefault': 'Par défaut',
  'ui.setDefault': 'Définir par défaut',
  'ui.decorTitle': 'Papiers peints & déco',
  'ui.decorOwned': 'Acquis — applicable partout gratuitement',
  'ui.decorUnlocks': 'Se débloque pour toutes les sociétés',
  'ui.decorFollowsDefault': 'ce bâtiment suit votre choix par défaut',
  'ui.decorFollowsOwn': 'ce bâtiment a son propre choix',
  'ui.followDefault': 'Suivre le choix par défaut',
  'ui.marketingName': 'Campagne marketing',
  'ui.marketingDesc':
    'Production ×{mult} pendant {duration}, pour toutes les sociétés. Racheter prolonge l’effet.',
  'ui.launchBtn': 'Lancer {price}',
  'ui.companiesReq': '{count} sociétés',
  'ui.stat.totalEarned': 'Total gagné',
  'ui.stat.projects': 'Projets terminés',
  'ui.stat.companies': 'Sociétés',
  'ui.stat.employees': 'Employés',
  'ui.stat.workstations': 'Postes de travail',
  'ui.stat.output': 'Production de l’équipe (ici)',
  'ui.stat.salaries': 'Salaires (tous)',
  'ui.stat.timePlayed': 'Temps de jeu',
  'ui.stat.founded': 'Fondation',
  'ui.settingsTitle': 'Réglages',
  'ui.soundOn': 'Son activé',
  'ui.soundOff': 'Son coupé',
  'ui.effectsOn': 'Effets activés',
  'ui.effectsOff': 'Effets coupés',
  'ui.speedTitle': 'Vitesse de simulation en direct',
  'ui.speedBtn': 'Vitesse ×{scale}',
  'ui.exportSave': 'Exporter la sauvegarde',
  'ui.importSave': 'Importer une sauvegarde',
  'ui.resetGame': 'Réinitialiser le jeu',
  'ui.autosaveHint':
    'La progression est sauvegardée automatiquement toutes les 10 secondes et à la fermeture. Votre équipe continue de travailler en votre absence (jusqu’à 24 h).',
  'ui.projectUnlocked': 'Projet débloqué !',
  'ui.welcomeAboard': 'Bienvenue à bord !',
  'ui.offToWorkshop': 'Direction l’atelier !',
  'ui.fireConfirm': 'Licencier {name} ? Aucune indemnité prévue.',
  'ui.wallpaperUnlocked': 'Papier peint débloqué !',
  'ui.newMapStyle': 'Nouveau style de carte !',
  'ui.campaignLive': 'Campagne lancée — les ventes s’affolent !',
  'ui.saveCodeCopied': 'Votre code de sauvegarde (copié dans le presse-papiers) :',
  'ui.pasteSaveCode': 'Collez votre code de sauvegarde :',
  'ui.invalidSaveCode': 'Code de sauvegarde invalide',
  'ui.saveImported': 'Sauvegarde importée',
  'ui.trainingComplete': 'Formation terminée — niveau {level} !',
  'ui.investorLeft': 'Un investisseur a laissé quelque chose…',
  'ui.investorTip': 'Tuyau d’investisseur ! Revenus ×2 pendant 60 s',

  // --- Identifiants d’erreur du moteur --------------------------------------
  'error.notEnoughMoney': 'Pas assez d’argent',
  'error.noSuchFloor': 'Étage introuvable',
  'error.noSuchProject': 'Projet introuvable',
  'error.projectLocked': 'Projet verrouillé',
  'error.workerNotFound': 'Employé introuvable',
  'error.workerBusy': 'Déjà occupé',
  'error.topGrade': 'Déjà au sommet de l’échelle',
  'error.notAtCap': 'Pas encore au plafond de compétence',
  'error.promoteInstead': 'Plafond de compétence atteint — promouvez plutôt',
  'error.maxSkill': 'Déjà au niveau de compétence maximal',
  'error.deskNotFound': 'Bureau introuvable',
  'error.deskUpgrading': 'Déjà en rénovation',
  'error.bestDesk': 'Déjà le meilleur bureau',
  'error.nothingToFastForward': 'Rien à accélérer',
  'error.candidateNotFound': 'Candidat introuvable',
  'error.officeFull': 'Plus de place — débloquez un nouvel étage',
  'error.maxHeight': 'Le bâtiment est déjà à sa hauteur maximale',
  'error.siteOccupied': 'Site déjà occupé',
  'error.countryUnlocked': 'Pays déjà débloqué',
  'error.ownCityFirst': 'Possédez d’abord toutes les sociétés de votre ville',
  'error.countryLocked': 'Pays non débloqué',
  'error.journeyBegun': 'Le voyage a déjà commencé',
  'error.invalidAmount': 'Montant invalide',
  'error.notEnoughVsCoin': 'Pas assez de VsCoin',
  'error.tooManyBoosts': 'Trop de bonus actifs',
  'error.invalidBoost': 'Bonus invalide',
  'error.invalidSpeed': 'Vitesse invalide',
  'error.unknownLanguage': 'Langue inconnue',
  'error.alreadyOwned': 'Déjà acquis',
  'error.wallpaperNotOwned': 'Papier peint non acquis',
  'error.mapThemeNotOwned': 'Style de carte non acquis',
  'error.emptyName': 'Le nom ne peut pas être vide',
  'error.companyNotFound': 'Société introuvable',
  'error.alreadyUnlocked': 'Déjà débloqué',
  'error.maxLevel': 'Déjà au niveau maximal',
  'error.noStory': 'Aucune histoire à fermer',
  'error.missionClaimed': 'Mission déjà réclamée',
  'error.missionIncomplete': 'Mission pas encore accomplie',
  'error.tutorialOver': 'Le tutoriel est déjà terminé',
  'error.stepUnfinished': 'Étape pas encore terminée',
  'error.noSuchContract': 'Contrat introuvable',
  'error.alreadyClaimed': 'Déjà réclamé',
  'error.contractUnfinished': 'Contrat pas encore rempli',

  // --- Traits des employés --------------------------------------------------
  'ui.rareBadge': 'RARE',
  'trait.night-owl.name': 'Oiseau de nuit',
  'trait.night-owl.desc': 'Livre pendant que la ville dort : +15 % de production.',
  'trait.coffee-addict.name': 'Accro au café',
  'trait.coffee-addict.desc': 'Carbure à l’espresso : +25 % de production, +10 % de salaire.',
  'trait.quick-study.name': 'Esprit vif',
  'trait.quick-study.desc': 'Apprend vite : +50 % d’expérience.',
  'trait.frugal.name': 'Économe',
  'trait.frugal.desc': 'Négocie modestement : −15 % de salaire.',
  'trait.perfectionist.name': 'Perfectionniste',
  'trait.perfectionist.desc': 'Peaufine tout : +10 % de production, −15 % d’expérience.',
  'trait.rockstar.name': 'Rockstar',
  'trait.rockstar.desc': 'Une légende en devenir : +40 % de production, +25 % de salaire.',

  // --- Événements aléatoires ------------------------------------------------
  'ui.eventKicker': 'Opportunité',
  'ui.eventAccept': 'Marché conclu !',
  'ui.eventDecline': 'Passer',
  'ui.eventAccepted': 'Affaire conclue !',
  'event.investor-offer.title': 'Un investisseur appelle',
  'event.investor-offer.text':
    'Il vous vire {cash} immédiatement — si tous les salaires doublent pendant {duration}. Marché conclu ?',
  'event.press-coverage.title': 'Une journaliste veut votre histoire',
  'event.press-coverage.text':
    'Sponsorisez l’article pour {cash} et le buzz double votre production pendant {duration}.',
  'event.crunch-pizza.title': 'Nuit de rush à la pizza',
  'event.crunch-pizza.text':
    'Commandez des pizzas pour tout l’étage ({cash}) : production ×{mult}, mais salaires ×{salaryMult} pendant {duration}.',
  'event.conference-keynote.title': 'Un créneau de keynote se libère',
  'event.conference-keynote.text':
    'Payez {cash} pour le créneau et la démo fait sensation : production ×{mult} pendant {duration}.',

  // --- Tirelire -------------------------------------------------------------
  'ui.vaultTitle': 'Tirelire',
  'ui.vaultFull': 'PLEINE',
  'ui.vaultOpen': 'Casser la tirelire',
  'ui.vaultOpened': 'Tirelire cassée — profitez du pactole !',
  'ui.vaultHint':
    'Chaque projet livré y dépose {rate} % en bonus. Elle se remplit jusqu’à deux heures de revenus — cassez-la quand vous voulez.',
  'error.vaultEmpty': 'La tirelire est vide — gagnez d’abord quelque chose.',

  // --- Animaux de bureau ----------------------------------------------------
  'ui.petsTitle': 'Coin des animaux',
  'ui.petHint': 'Un compagnon sans bonus pour vos étages.',
  'ui.petAdopt': 'L’installer ici',
  'ui.petHere': 'Vit ici',
  'ui.petDismiss': 'Renvoyer l’animal à la maison',
  'ui.petAdopted': 'Nouveau compagnon de bureau adopté !',
  'error.petNotOwned': 'Vous ne possédez pas encore cet animal.',
};
