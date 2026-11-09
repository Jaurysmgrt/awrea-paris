# L'Atelier sur votre téléphone

L'Atelier s'installe sur votre iPhone ou votre Android comme une application : une icône
« Atelier » sur l'écran d'accueil, qui s'ouvre en plein écran, sans barre d'adresse. Pas d'App Store,
pas de Google Play, rien à payer, rien à mettre à jour : c'est le même Atelier que sur l'ordinateur,
à la même adresse secrète, avec la même connexion.

Cette application est **privée** : elle n'est faite que pour la Maison. Les clientes n'en ont pas, et
le site public ne mène jamais à elle.

## Installer l'application

Ouvrez d'abord l'Atelier sur le téléphone, à son adresse secrète, et connectez-vous. Puis allez dans
**Réglages › Application** : la page montre les étapes pour votre téléphone.

**Sur iPhone ou iPad** (Safari) :

1. Touchez le bouton **Partager**, le carré d'où sort une flèche.
2. Choisissez **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvrez l'Atelier depuis sa nouvelle icône et connectez-vous une fois, avec Face ID si vous l'avez
   réglé.

**Sur Android** (Chrome) :

1. Touchez le bouton **Installer l'application** de la page Application, ou le menu (les trois
   points en haut à droite) puis **Installer l'application**.
2. Confirmez, puis ouvrez l'Atelier depuis sa nouvelle icône.

**Sur ordinateur** (facultatif) : dans Chrome ou Edge, l'icône d'installation au bout de la barre
d'adresse ; dans Safari sur Mac, **Fichier › Ajouter au Dock**.

## Recevoir les notifications

Dans l'application installée, **Réglages › Application › Recevoir les notifications ici**, puis
acceptez quand le téléphone le demande. Sur iPhone, les notifications n'arrivent que dans
l'application installée depuis l'écran d'accueil (iOS 16.4 ou plus récent).

Vous choisissez ensuite, pour chaque téléphone, ce qui vous prévient :

| Notification | Quand |
| --- | --- |
| Nouvelle commande | Une cliente vient de payer une commande |
| Intervention requise | Commande à vérifier, retour demandé, message délicat, paiement contesté ou remboursement refusé |
| Approbation demandée | Un agent propose une action qui attend votre accord |
| Anomalie détectée | Une confection approche de sa date annoncée ou la dépasse |
| Erreur | Un agent n'a pas pu tout faire |
| Alerte de sécurité | Connexion à l'Atelier, Face ID ajouté, compte bloqué |
| Passage des agents terminé | Chaque agent a fini son tour planifié (non coché d'emblée) |

**Envoyer une notification d'essai** vérifie que tout fonctionne. Toucher une notification ouvre la
bonne page de l'Atelier (la commande, les validations, les réglages).

Une notification s'affiche sur l'écran verrouillé : elle ne montre donc **jamais** le nom, l'adresse
ou le téléphone d'une cliente, seulement un numéro de commande, un montant ou une consigne. Le détail
s'ouvre dans l'Atelier, après la connexion.

Les notifications demandent deux clés à ajouter une fois dans Vercel (`ACTIVATION.md`, étape 15).
Tant qu'elles manquent, la page Application le dit, et aucune notification n'est simulée.

## Sans réseau

L'Atelier a besoin d'internet pour montrer vos commandes à jour. Par sécurité, **rien n'est gardé
sur le téléphone** : sans réseau, l'application affiche « Pas de réseau » et un bouton Réessayer, sans
aucune donnée. Si le réseau tombe pendant que vous travaillez, un bandeau le dit en haut de la page :
ce qui s'affiche peut dater, et rien ne s'enregistre avant le retour du réseau.

## Si un téléphone est perdu

Sur un autre appareil, ouvrez l'Atelier, **Réglages › Sécurité › Déconnecter tous les appareils**.
Toutes les sessions se ferment, et plus aucun téléphone ne reçoit de notification. Vous vous
reconnectez ensuite normalement, et réactivez les notifications sur votre nouveau téléphone.

Le lien « Ce n'était pas moi » des e-mails de connexion fait la même chose.

## Pourquoi une application web plutôt qu'une application de l'App Store

Deux façons existaient : une application web installable (ce qui est fait), ou une application
téléchargée depuis l'App Store et Google Play, construite avec React Native et Expo.

| | Application web installable (choisie) | Application App Store et Google Play (React Native, Expo) |
| --- | --- | --- |
| Installation | Depuis l'Atelier, en trois gestes | Depuis les boutiques, après leur validation |
| Coût | Aucun | Compte Apple 99 $ par an, compte Google 25 $ une fois |
| Mises à jour | Instantanées, avec le site | Nouvelle version à faire valider à chaque changement |
| Discrétion | Aucune fiche publique : rien ne mène à l'Atelier | Une fiche dans les boutiques, ou une distribution privée plus lourde à gérer |
| Sécurité | Même connexion, même double authentification, mêmes règles que l'Atelier | Une seconde porte d'entrée à protéger, avec ses propres sessions |
| Notifications | Oui, sur iPhone (iOS 16.4 et plus) et Android | Oui |
| Face ID | Oui, pour la connexion (clé d'accès) | Oui |
| Travail sans réseau | Volontairement non : aucune donnée sur le téléphone | Possible, mais des données de clientes resteraient sur l'appareil |
| Fonctions du téléphone | Appareil photo pour les photos des pièces, partage | Accès plus large (widgets, NFC), sans usage prévu pour l'Atelier |

Pour un Atelier réservé à la Maison, l'application web fait tout ce qui sert au quotidien, sans
coût, sans attente de validation et sans seconde porte d'entrée. Une application des boutiques
resterait possible plus tard, si un besoin précis l'exigeait (par exemple travailler en atelier sans
aucun réseau) : l'Atelier et ses règles ne changeraient pas.
