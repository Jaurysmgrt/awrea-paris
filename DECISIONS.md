# DÉCISIONS

> Chaque choix incertain est tranché, noté ici avec sa justification, puis appliqué. Le plus récent en
> bas de chaque rubrique. Référence : cahier des charges complet (13/10/2026), `MARQUE.md`.

## Direction artistique

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

