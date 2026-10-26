# DÉCISIONS

> Chaque choix incertain est tranché, noté ici avec sa justification, puis appliqué. Le plus récent en
> bas de chaque rubrique. Référence : cahier des charges complet (13/10/2026), `MARQUE.md`, et les
> ressources officielles de la Maison (`RESSOURCES.md`), qui priment sur tout le reste depuis le 15/10.

## Direction artistique

> Les choix de polices (Instrument Serif, Inter Tight), de mesure, de taille de texte et de logo
> provisoire pris le 13/10 sont remplacés par ceux des ressources officielles de la Maison
> (rubrique « Ressources officielles de la Maison » plus bas). Ils restent ici pour l'historique.

| Date | Décision | Justification |
| --- | --- | --- |
| 13/10 | **Inter Tight** plutôt que General Sans | Toutes deux proposées ; Inter Tight est sous licence libre OFL, hébergeable dans le dépôt sans compte ni téléchargement manuel. |
| 13/10 | Noms de jetons conservés : `ink` = noir, `ivory` = blanc cassé, `pearl` = gris pierre, plus `taupe` | Évite de renommer des centaines de références ; la correspondance est écrite dans `styles/tokens.css` et `MARQUE.md`. |
| 13/10 | Petits textes secondaires sur fond clair en **taupe profond** (taupe mêlé de noir), taupe pur pour les grands textes et sur fond noir | Le taupe pur fait 3,3:1 sur le blanc cassé ; l'accessibilité AA impose 4,5:1 pour les petits textes. |
| 13/10 | Petits téléphones (< 480 px) : texte courant à 14 px, marges latérales de 16 px | Consigne : « élargis la colonne ou réduis légèrement la taille du texte » plutôt que des trous. |
| 13/10 | Mesure du texte : 28 em (60 à 70 caractères d'Inter Tight) | Mesurée sur les pages : 32 em donnait 76 caractères. |
| 13/10 | Justification : équilibreur par paragraphe (réglages de ±1 % de l'espacement des mots et des lettres), espaces au plus 2 fois l'espace naturel (2,5 sur les plus petits téléphones) | La justification du navigateur seule laisse des trous ; l'équilibreur ne change que le style du paragraphe, jamais son texte. |
| 13/10 | Un paragraphe visible dès l'ouverture garde son nombre de lignes (tolérance de 0,6 sur les trous) | « Aucun décalage de mise en page » : élargir la plage d'espacement au-delà de ±1 % serait une variation visible. |
| 13/10 | Animations apaisées : transitions supprimées (et non réduites à 0,01 ms) | Une durée infime faisait transiter toutes les propriétés de tous les éléments et faussait les mesures. |
| 13/10 | En-tête au défilement : aplat plein, plus de verre dépoli | Code de la liste noire, ajouté aux interdits. |
| 13/10 | Fonctions demandées par la maison mais présentes dans la liste noire : conservées avec une exécution propre à Awrea | Détail dans `docs/equipes/design/arbitrages.md`. |
| 13/10 | **Grille éditoriale asymétrique de la boutique conservée** | Le cahier des charges complet la demande explicitement (prévaut sur l'arbitrage 3f). |
| 13/10 | Une seule durée (`--dur`, 0,8 s) et une seule courbe (`--ease`, celle de l'ancien « silk ») pour toutes les animations, défilement doux compris ; les séquences signature enchaînent cette durée, les respirations ambiantes en sont un multiple ; l'écriture et les traits pilotés par le défilement restent linéaires (ce sont des proportions, pas des durées) | Consigne d'homogénéité « même durée et même courbe pour toutes les animations » ; courbe rapide au départ : la réponse reste immédiate malgré la lenteur. |
| 13/10 | Logo provisoire vectorisé depuis les polices du site (AW qui se touchent, PARIS espacé à 0,62 em) | Rendu identique partout (favicon, e-mails, presse) ; tracés réutilisables pour le monogramme dessiné à l'ouverture. |
| 13/10 | Inter Tight en un seul fichier variable (45 Ko) plutôt que trois graisses fixes | Moins de requêtes, même poids total, toutes les graisses disponibles. |
| 13/10 | Polices servies depuis le site (fichiers WOFF2 dans le dépôt, `next/font/local`) | RGPD et vitesse : aucun appel à Google Fonts, même à la compilation. |
| 13/10 | La page « Silhouettes » devient **Outfits** (`/outfits`, redirection permanente depuis `/silhouettes`) | Rubrique Instagram de la marque citée dans le cahier des charges. |

## Commerce et données

| Date | Décision | Justification |
| --- | --- | --- |
| 13/10 | Certificat émis à la commande, verrou atomique par commande ; code de rattachement chiffré (AES-GCM) pour la réimpression | Le webhook Shopify peut arriver deux fois ; l'atelier doit pouvoir réimprimer le code. |
| 13/10 | Drops : pièces retirées de la boutique jusqu'à l'ouverture, accès signé de 30 jours, la vente privée prime sur l'accès anticipé | Le contrôle se fait côté serveur (panier, commande) ; l'affichage n'est qu'un confort. |
| 13/10 | Avis : schéma existant de la base clientes, lien signé de 60 jours, photos recompressées dans le navigateur, avis anonymisés à la suppression du compte | Avis vérifiés sans données de localisation ; droit à l'effacement respecté sans faire disparaître l'avis. |
| 13/10 | Interrupteurs `*_PROVIDER` : la valeur demandée n'est appliquée que si ses clés sont présentes, sinon simulation | Le site ne plante jamais faute de clé. |
| 13/10 | Shopify : jeton **privé** du canal Headless de préférence (jeton public accepté) ; accès Admin des agents par une application du Dev Dashboard, jeton de 24 h demandé et renouvelé par le site (ancien jeton permanent accepté) | Depuis janvier 2026, Shopify ne permet plus de créer d'« applications personnalisées » à jeton permanent ; les appels partent du serveur. |
| 13/10 | Le mot de passe de démonstration de l'Atelier reste refusé dès qu'une adresse de boutique Shopify est renseignée, même avec `COMMERCE_PROVIDER=mock` | Une prévisualisation publique branchée sur la vraie boutique ne doit jamais s'ouvrir avec un mot de passe connu. |
| 13/10 | Microsoft Clarity rangé dans « mesure d'audience » (masquage strict), pixel TikTok dans « publicité », chargés après accord ; Clarity reçoit l'accord explicite (exigence Microsoft pour l'EEE) | Mêmes règles que les autres traceurs ; déclarés dans la politique cookies et de confidentialité. |
| 13/10 | Jeton Instagram renouvelé chaque semaine par la tâche quotidienne, gardé chiffré dans le stockage technique | Il expire au bout de 60 jours ; la créatrice n'a rien à refaire. |
| 13/10 | Catalogue Shopify : régénération sans délai (`expire: 0`) à chaque webhook produit, collection ou stock | Peu de changements, et un stock juste vaut mieux qu'une page servie de l'ancien cache. |

## Organisation

| Date | Décision | Justification |
| --- | --- | --- |
| 15/10 | Dix-huit rôles de gestion quotidienne (`lib/agents/roles/`), un passage planifié par matin pour tous (`/api/cron/equipe`), chacun relu par le Contrôle (critique indépendant) | Un seul cron Vercel au lieu de dix-huit ; chaque rôle prévient ou propose, l'argent et l'irréversible restent soumis à la créatrice. |
| 15/10 | Rendez-vous réservés en ligne sur l'agenda de l'atelier (heure de Paris, verrou contre les doubles réservations), lien d'annulation signé, abonnement iCal pour la créatrice | Plus d'aller-retour par e-mail pour fixer un essayage ; l'agenda personnel de la créatrice ferme les créneaux déjà pris. |
| 15/10 | Suivi des erreurs : Sentry par son API d'envoi, sans bibliothèque, et repli local | Aucun poids ajouté au site ; rien de personnel n'est transmis (ni jeton, ni e-mail, ni cookie). |

## Méthode de travail

| Date | Décision | Justification |
| --- | --- | --- |
| 13/10 | Propositions de design construites dans un laboratoire isolé (`app/(lab)`), supprimé après la fusion | Les trois directions travaillent sans se voir, sur les vraies pièces. |
| 13/10 | Tests de bout en bout sur un serveur et un fichier de données séparés (`STORE_FILE`) | Ne pas perturber le serveur de développement des équipes. |
| 13/10 | Sous la limite d'utilisation, les équipes travaillent une par une ; les agents interrompus sont relancés à la levée | Consigne du cahier des charges. |
| 13/10 | Le choix de la direction fusionnée est fait par le chef de projet, sans attendre de validation | « Comme je ne valide pas, choisis toi-même la version fusionnée et documente le choix. » |

## Écriture et édition

| Date | Décision | Justification |
| --- | --- | --- |
| 14/10 | Règles d'écriture de la créatrice réunies dans un seul module (`lib/writing/rules.ts`), partagé par le script `npm run audit:ecriture` (CI et maintenance), l'éditeur visuel et les agents | Une seule définition de ce qui est interdit ; la CI échoue sur tiret, formulation interdite, point d'exclamation, emoji, apostrophe droite et typographie (corrigeable par `--fix`). |
| 14/10 | Espace insécable ordinaire (U+00A0) devant ; : ! ? » et dans les guillemets | L'espace fine (U+202F) n'existe ni dans Instrument Serif ni dans Inter Tight : elle s'afficherait dans une police de secours. |
| 14/10 | Textes des agents et de l'assistante : typographie et tirets corrigés automatiquement, formulations interdites signalées ; une publication automatique qui en contient devient une proposition à valider | La créatrice garde la main sur tout ce qui part en ligne sous son nom. |
| 14/10 | Textes de la créatrice dans l'éditeur : signalés avec une suggestion, jamais bloqués ; un texte gardé malgré un signalement est inscrit dans `content/ecriture-acceptes.json` et ne bloque pas la CI | Consigne : « signale les problèmes avec une suggestion de correction, sans bloquer la créatrice ». |
| 14/10 | **Éditeur visuel maison « Édition » plutôt que TinaCMS** (comparaison ci-dessous) | Il remplit tous les critères demandés sans compte extérieur ni abonnement, et sans ralentir le site. |
| 15/10 | Contenus en documents JSON (`content/site/<langue>/`), lus par `getDoc` ; textes des composants interactifs transmis par `TextsRoot` ; repères `{nom}` remplis à l'affichage ; registre par équipe (`content/site/registre/`) | Un seul accès aux textes, modifiable dans l'éditeur sans toucher au code ; plusieurs équipes migrent en parallèle sans se gêner. |
| 15/10 | L'interface de l'Atelier et de l'éditeur reste écrite dans le code | Outils de la créatrice, pas le site public : les rendre modifiables ajouterait des documents sans gain pour elle. |
| 15/10 | Aperçu de l'éditeur dans un cadre du site : `frame-src` et `frame-ancestors 'self'` seulement pour une session de l'Atelier en mode Édition ; partout ailleurs, aucun cadre | L'aperçu téléphone, tablette, ordinateur montre le brouillon tel quel, sans ouvrir le site à l'intégration par un autre site. |
| 15/10 | E-mails : même éditeur, blocs dédiés (en-tête au monogramme, photographie, texte, pièce, bouton, détail de commande, signature, pied légal), blocs conditionnels « si » et « sauf », rendu maison (tableaux, mode sombre, bouton pour Outlook) ; export Brevo, Klaviyo, Shopify Liquid | Un e-mail se compose comme une page ; aucun service d'éditeur d'e-mails à payer ; les services d'envoi reçoivent un gabarit importable. |
| 15/10 | Paragraphes des e-mails alignés à gauche, pas justifiés | Gmail et Outlook ne coupent pas les mots : la justification y creuserait des trous. Même logique que le fer à gauche du site quand l'équilibre échoue. |
| 15/10 | Désinscription des lettres par lien signé (un an) et en-tête `List-Unsubscribe` en un clic ; la page demande une confirmation | Obligation légale et exigence de Gmail et Apple Mail ; un robot qui suit les liens ne désinscrit personne. |

### Pourquoi « Édition » plutôt que TinaCMS

Le cahier des charges proposait TinaCMS, en autorisant un autre outil s'il répond mieux à tous les
critères sans bloquer le développement. Comparaison faite le 14/10 :

| Critère demandé | TinaCMS | Édition (maison) |
| --- | --- | --- |
| Cliquer sur un texte de la page pour le modifier sur place | Clic qui ouvre le champ dans un panneau latéral ; la page doit passer en composants client (`useTina`) | Texte modifié directement dans la page, composants serveur conservés (aucun poids ajouté pour les visiteuses) |
| Double authentification, comptes autorisés, blocage, alerte à chaque connexion | Comptes Tina Cloud, hors de notre double authentification ; sinon serveur auto-hébergé à écrire | Même accès que l'Atelier : comptes autorisés, code à six chiffres, blocage, alerte e-mail |
| Brouillons, publication programmée, historique et retour en un clic | Brouillons et flux éditorial réservés aux offres payantes ; pas de programmation native | Inclus : brouillon, programmation, historique de chaque page, retour en un clic |
| Aperçu téléphone, tablette, ordinateur | Non natif | Inclus |
| Garde-fous de la direction artistique (blocs, polices, couleurs, longueurs) | Possible par la configuration des champs | Natif : seuls les blocs du design system existent |
| Recadrage, déclinaisons, point focal, texte alternatif automatique | Médiathèque simple, sans point focal | Inclus (sharp, point focal, texte alternatif proposé puis modifiable) |
| Contrôle d'écriture non bloquant | À développer en extension | Même module que la CI, en direct pendant la saisie |
| Version anglaise à côté du français | Documents séparés par langue | Champ anglais affiché à côté du français |
| E-mails modifiables avec les mêmes blocs | Hors périmètre | Même éditeur, blocs d'e-mail dédiés |
| Fonctionne en local sans compte, contenu dans Git | Oui (mode local) | Oui : `content/site/<langue>/*.json`, écrits directement en local |
| En ligne | Tina Cloud (compte, abonnement selon l'usage) ou base et authentification à héberger | Stockage déjà prévu (Upstash) ; recopie dans Git par l'API GitHub si on la branche |

Les contenus restent des fichiers JSON lisibles dans Git : un passage futur à un CMS fondé sur Git
(TinaCMS compris) resterait possible sans réécrire les textes.

## Ressources officielles de la Maison (à partir du 15/10)

Les ressources de la Maison (`ressources-awrea/`, inventaire et droits dans `RESSOURCES.md`) priment
sur toute consigne antérieure de typographie, de textes, de produits et de mise en page. Décisions
arrêtées par le chef de projet pendant leur intégration.

| Date | Décision | Justification |
| --- | --- | --- |
| 15/10 | Les originaux de `ressources-awrea/` ne sont jamais modifiés ; `npm run ressources` en tire les versions du site (polices WOFF2, logo, photos déclinées) | On peut toujours revenir au fichier remis par la créatrice, et refaire les versions après un remplacement. |
| 15/10 | Polices officielles : **Fraunces 72pt Italic** (400) pour tous les titres, en italique ; **Cormorant Garamond** (400) pour les textes, la navigation, les boutons, les formulaires et les prix. Fichiers WOFF2 réduits aux alphabets latins, servis par le site, licences OFL jointes | Polices remises par la Maison ; la licence OFL permet l'usage web, l'incorporation et la réduction ; aucun appel extérieur (RGPD, vitesse). |
| 15/10 | Fraunces jamais sous 25 px : les noms de pièces des cartes, du panier et des commandes se composent en Cormorant | Fraunces 72pt est dessinée pour le grand format et paraît trop noire en petit ; la maquette PAGE PRODUIT compose « Le body Aura » en Cormorant. |
| 15/10 | Aucun faux italique ni faux gras (`font-synthesis: none`) ; l'emphase passe par l'échelle, la police des titres ou le soulignement | Une seule face est fournie par police : un italique ou un gras inventé par le navigateur déformerait les lettres. |
| 15/10 | Texte courant à 20 px sur 32 px, rien sous 16 px ; mesure de 24,5 em (65 caractères de Cormorant) | Cormorant a un petit œil ; la grille de 8 px et l'interlignage 1,6 sont gardés. |
| 15/10 | **Croisan** (police du logo) jamais chargée ni publiée : fichier ignoré par Git, version web préparée hors du site pour le jour où la licence commerciale sera achetée | Édition « Personal Use » de Hishand Studio : tout usage commercial demande une licence. Le logo s'affiche à partir des fichiers officiels, sans la police. |
| 15/10 | **Logo officiel en PNG** à fond transparent (logo entier et monogramme), affiché en masque par `components/brand/Logo.tsx` : noir sur fond clair, blanc cassé en mode Nuit. Le SVG est demandé à la Maison | Aucun SVG n'a été fourni ; un tracé automatique déformait les déliés. Le masque donne la couleur du texte avec un seul fichier. |
| 15/10 | **Langage des maquettes étendu à tout le site** (`ressources-awrea/DA PRÉSENTATION`) : titres très grands en italique, filets fins, champs soulignés sans cadre, boutons noirs en pilule, pastille « Nouveau », photos de cartes arrondies ; primitives communes (`.btn`, `.field`, `.badge`, `.rule--center`, `.media--card`, `PageHeader`) décrites dans `DESIGN.md` | Les cinq maquettes ne couvrent pas toutes les pages : leur langage, appliqué partout par les mêmes primitives, garde le site homogène. |
| 15/10 | En-tête et pied de page des maquettes : logo centré, cinq entrées (Accueil, Sur commande, Collections, Contact, Mon Panier) ; quatre colonnes au pied de page et « © Awrea Paris 2026 » | Maquettes EN-TÊTE DU SITE et BAS DE PAGE ; cinq entrées au plus (règle « épuré et luxueux »). |
| 15/10 | **Textes officiels repris mot pour mot** (À propos, texte de collection, teasing, CGV, mentions légales) et **exemptés du contrôle d'écriture** : seule la typographie y est contrôlée. Marquage `"officiel": true` (JSON), `officiel: true` (TypeScript), `data-officiel` (page rendue) | Ce sont les mots de la créatrice : les règles d'écriture servent aux nouveaux textes, pas à réécrire les siens. Le marquage garde le contrôle sur tout le reste. |
| 15/10 | Corrections permises sur les textes officiels : typographie française et fautes évidentes. Dans les citations de `MARQUE.md` et `content/brand/voice.md` : guillemets anglais « “ Hypnotic lace ” » remplacés par des guillemets français, capitale à « Lace » comme dans le nom de la collection partout sur le site, espaces insécables avant les deux-points et dans les guillemets ; aucun autre mot touché | Typographie française du projet ; le nom de la collection s'écrit d'une seule façon. |
| 15/10 | **Photos provisoires générées admises jusqu'aux shootings** (`PHOTOS IA EN ATTENDANT`) : recadrées en 2:3 (ce qui écarte le filigrane de deux fichiers), marquées `provisoire: true`, mention discrète « visuel provisoire », jamais envoyées aux flux Google et Meta | La Maison n'a pas encore de photographies de ses pièces ; la transparence sur les images générées est gardée (à faire valider : `LEGAL-A-COMPLETER.md`). Exception à la règle « aucune image générée ». |
| 18/10 | **Modèle sur demande** : chaque pièce est créée après la commande par des artisans français, sans stock. Le site ne lit ni n'affiche aucune quantité ; Shopify accepte chaque taille en permanence ; plus de rupture, de pièces restantes, de liste d'attente ni d'alerte de retour en stock | Modèle de la Maison (TEASING MARQUE : « Il n'y a pas de stock »). |
| 18/10 | **Délai de fabrication** sur chaque fiche (métachamps `awrea.delai_min` et `awrea.delai_max`, réglables dans l'Atelier › Catalogue) ; repli provisoire par catégorie : bodys et tops 2 à 3 semaines, robes 3 à 4 semaines | La seule information de disponibilité d'une pièce créée sur demande est le temps de sa confection. |
| 18/10 | **Cinq étapes de commande**, libellés exacts : « Commande reçue », « En confection », « Prête », « Expédiée », « Livrée » ; un e-mail modifiable à chaque étape ; avec Shopify, la confection se marque par les étiquettes `en-confection` et `prete` | La cliente suit la confection de sa pièce ; Shopify ne connaît que le paiement, l'expédition et la livraison. |
| 18/10 | **Numéro de création** : numéro d'ordre unique de la Maison, tiré de façon atomique à chaque pièce commandée, jamais réattribué ni remis à zéro, affiché « Création n° 0001 » sur le certificat et l'étiquette ; le code de vérification (serial, QR) reste | Remplace le numéro d'édition « N° 3 / 6 », qui supposait une série. |
| 18/10 | **Avant-premières sans rareté** (anciens « drops ») : une collection annoncée a des dates écrites en toutes lettres, sans compte à rebours ni quantité ; avant-première des inscrites par lien personnel, présentation privée par mot de passe | Aucune urgence artificielle ; une pièce créée sur demande ne manque jamais. |
| 18/10 | **Prix et délais provisoires** : prix donnés sans réserve pour le body Aura (70,00 €), la robe Odessa (100,00 €) et la robe Aria (204,00 €) ; prix provisoires pour la robe Sienna, le body Gaïa, le top Evina et le top Kira ; tous les délais provisoires. Case « provisoire » dans l'Atelier › Catalogue et métachamps `awrea.prix_provisoire`, `awrea.delai_provisoire` | Les valeurs viennent de la Maison mais ne sont pas toutes confirmées : elles sont signalées jusqu'à leur confirmation. |
| 18/10 | Matières, compositions, entretien et mesures : « [À COMPLÉTER : …] » tant que la Maison ne les a pas donnés, jamais déduits des photos | Aucune information inventée. |
| 18/10 | Collection « **Hypnotic Lace** » (`hypnotic-lace`) et ses sept pièces ; « Lace is more » redirigée (308) ; collections et pièces inventées supprimées | Catalogue réel de la Maison. |
| 24/10 | Dans les textes, la Maison parle de « la créatrice ». Son nom, connu par les mentions légales officielles, figure sur les pages légales ; il n'est pas mis en avant ailleurs sans son accord | Discrétion par défaut ; à confirmer avec elle. |
| 24/10 | `GUIDE-CREATRICE.md` : premier jet complet de l'utilisation du site et de l'Atelier ; les écrans encore en construction sont décrits tels que prévus et marqués « à vérifier » ; les captures d'écran sont ajoutées après le contrôle final | Les captures doivent montrer le site final ; la relecture finale confirme chaque geste sur le serveur local. |

## Réponses de la créatrice (25/10)

| Date | Décision | Justification |
| --- | --- | --- |
| 25/10 | Texte aligné à gauche partout ; l'équilibreur de justification et la césure de mesure sont retirés | « Le texte a des trous dedans » : la justification creusait des espaces sur téléphone. Remplace les décisions du 13/10 sur la justification. |
| 25/10 | Mode Nuit et animations apaisées toujours automatiques, selon le réglage de l'appareil ; plus d'interrupteur dans le site | « Mon tel est en sombre, faut que les applications soient sombres, et si je suis pas en sombre, blanches. » |
| 25/10 | Taille XL (42) proposée pour toutes les pièces | Demande de la créatrice ; le guide des tailles avait déjà ses mesures, toujours « à confirmer ». |
| 25/10 | Retours à la charge de la cliente, comme l'article 7 des CGV : bordereau avec l'adresse de l'atelier (`shop.returnLabelPrepaid` pour offrir un jour l'étiquette prépayée) | Choix de la créatrice ; supprime l'écart entre les CGV et le site. |
| 25/10 | La cliente reçoit l'e-mail de confirmation du site : avec Shopify, « Commande reçue » se colle dans la confirmation de commande de Shopify (bouton « Pour Shopify ») | Shopify ne permet pas de couper sa propre confirmation ; un seul e-mail, dans la voix de la Maison. |
| 25/10 | Rendez-vous en appel vidéo seulement : l'essayage à l'atelier n'est plus proposé, le premier rendez-vous sur mesure se fait aussi en vidéo | Aucune adresse d'atelier à publier. |
| 25/10 | La Maison facture la TVA : prix TTC, TVA à 20 % sur les factures (déjà le fonctionnement par défaut) ; numéro de TVA à compléter | Réponse de la créatrice. |
| 25/10 | Version anglaise en anglais britannique ; photos provisoires gardées pour la mise en ligne ; logo en PNG officiels en attendant le fichier vectoriel | Réponses de la créatrice. |
| 26/10 | Le site reste privé jusqu'à ce qu'il soit fini : aucune mise en ligne, le domaine `awreaparis.com` (enregistré chez Wix) reste non relié ; la créatrice le voit par les aperçus privés. Publication (Vercel, puis DNS chez Wix) une fois le site terminé | « Pour l'instant je veux le garder pour moi », « et le publier quand il est fini ». |
| 26/10 | Mode « site privé » (`SITE_PRIVE=1`) : le site peut être mis en ligne pour que la créatrice essaie l'Atelier, tandis qu'une visiteuse ne voit qu'une page « Bientôt » et que rien n'est indexé | « Je veux voir l'Atelier par moi-même » tout en gardant le site pour elle ; la protection ne dépend pas des options de l'hébergeur. |
