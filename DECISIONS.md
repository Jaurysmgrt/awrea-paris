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
| 13/10 | Une seule durée (`--dur`, 0,8 s) et une seule courbe (`--ease`) pour toutes les animations ; les respirations ambiantes en sont des multiples | Consigne d'homogénéité « même durée et même courbe pour toutes les animations ». |
| 13/10 | Polices servies depuis le site (fichiers WOFF2 dans le dépôt, `next/font/local`) | RGPD et vitesse : aucun appel à Google Fonts, même à la compilation. |
| 13/10 | La page « Silhouettes » devient **Outfits** (`/outfits`, redirection permanente depuis `/silhouettes`) | Rubrique Instagram de la marque citée dans le cahier des charges. |

## Commerce et données

| Date | Décision | Justification |
| --- | --- | --- |
| 13/10 | Certificat émis à la commande, verrou atomique par commande ; code de rattachement chiffré (AES-GCM) pour la réimpression | Le webhook Shopify peut arriver deux fois ; l'atelier doit pouvoir réimprimer le code. |
| 13/10 | Drops : pièces retirées de la boutique jusqu'à l'ouverture, accès signé de 30 jours, la vente privée prime sur l'accès anticipé | Le contrôle se fait côté serveur (panier, commande) ; l'affichage n'est qu'un confort. |
| 13/10 | Avis : schéma existant de la base clientes, lien signé de 60 jours, photos recompressées dans le navigateur, avis anonymisés à la suppression du compte | Avis vérifiés sans données de localisation ; droit à l'effacement respecté sans faire disparaître l'avis. |
| 13/10 | Interrupteurs `*_PROVIDER` : la valeur demandée n'est appliquée que si ses clés sont présentes, sinon simulation | Le site ne plante jamais faute de clé. |

## Organisation

| Date | Décision | Justification |
| --- | --- | --- |
| 13/10 | Propositions de design construites dans un laboratoire isolé (`app/(lab)`), supprimé après la fusion | Les trois directions travaillent sans se voir, sur les vraies pièces. |
| 13/10 | Tests de bout en bout sur un serveur et un fichier de données séparés (`STORE_FILE`) | Ne pas perturber le serveur de développement des équipes. |
| 13/10 | Sous la limite d'utilisation, les équipes travaillent une par une ; les agents interrompus sont relancés à la levée | Consigne du cahier des charges. |
| 13/10 | Le choix de la direction fusionnée est fait par le chef de projet, sans attendre de validation | « Comme je ne valide pas, choisis toi-même la version fusionnée et documente le choix. » |
