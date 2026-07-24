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

  // --- Tutoriel (Gabriel parle) -------------------------------------------
  'tutorial.welcome.text':
    'Salut ! Moi c’est Gabriel, ton investisseur providentiel — au sens littéral. Tu rêves d’une IA qui aide tout le monde, et je suis là pour te mener de ce garage jusqu’aux étoiles. On y va ?',
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

  'story.dream-achieved.title': 'Gratuite comme la lumière',
  'story.dream-achieved.text':
    'Depuis le labo orbital, ton IA touche désormais tout le monde — toutes les langues, tous les fuseaux, gratuite comme la lumière du soleil, exactement comme promis à la tondeuse. Ils ne rient plus. Ils montent leurs propres garages.',
};
