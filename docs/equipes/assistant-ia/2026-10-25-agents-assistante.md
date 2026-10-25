> Copie du compte rendu de l’équipe des agents et de l’assistante (lot « agents-assistante », 25/10/2026), recopiée par l’intégration. Les suites 1 à 13 ont été appliquées par le lot « intégration » le 25/10/2026 ; la suite 14 (tâche planifiée hebdomadaire du bilan du catalogue) reste facultative.

# Compte rendu du lot « agents-assistante » (25/10/2026)

Reprise du travail des équipes précédentes (actions, événements, rôle production, assistante en partie
adaptés), vérifié puis terminé. Les corrections transmises par l'équipe de l'Atelier sont intégrées.

## Fichiers touchés

Agents (lib/agents/**)
- policy.ts : update_stock et notify_waitlist retirées ; nouvelles actions validées par la créatrice :
  send_client_message (« Irréversible, message à une cliente ») et confirm_piece_terms (« Touche à
  l'argent, engage la Maison auprès des clientes ») ; libellés « Publier la fiche d'une pièce »,
  « Retirer une pièce du catalogue », « Alerter l'atelier (retard de confection, anomalie) » ;
  isActionType(). Principe inchangé : argent et irréversible toujours validés.
- confection.ts (nouveau, module pur, testé) : confectionAlerts (en retard, date proche, confection qui
  tarde à commencer, d'après le délai annoncé et lib/customers/order-timeline.ts), delayLooms,
  alertLine, delayMessage (message préparé pour la cliente), reviewPiece et catalogueReview.
- ids.ts (nouveau, pur) : LEGACY_AGENT_IDS (« commandes-stock » → « commandes-confection ») et
  currentAgentId, réexportés par log.ts.
- team/commandes-confection.ts (nouveau) : bloquées et paiements en attente (flag_order) ; veille de
  la confection avec une alerte par situation nouvelle ; message de retard préparé en proposition
  (jamais envoyé sans la créatrice, rappel de l'article 5 des CGV dans la raison) ; proposition de
  confirmer chaque prix ou délai provisoire (une par pièce, reproposée au plus tôt 30 jours après une
  décision) ; synthèse à l'atelier, constats enfermés par fence(). Mémoire
  agents:commandes-confection:memory (reprend les commandes déjà signalées de l'ancienne).
- team/commandes-stock.ts : renvoi déprécié vers le nouvel agent (seul app/api/checkout/route.ts
  l'importe encore).
- registry.ts : agent « Commandes et confection » ; Catalogue lançable (bilan) ; runAgent accepte
  l'ancien identifiant (tâche planifiée de vercel.json, bouton de l'onglet Commandes) ; agentInfo().
- log.ts, events.ts, perform.ts (propositions d'actions retirées écartées, notify_waitlist hors des
  publications), actions.ts (exécuteurs send_client_message, confirm_piece_terms via updatePiece,
  change_price via updatePiece, composition jamais exigée, détail par défaut « Créée sur demande par
  des artisans français », import de lib/waitlist supprimé).
- team/catalogue.ts : bilan runCatalogueReview (photos, prix, délais provisoires, composition,
  entretien, taille du mannequin, consignés au journal) ; fiche sans composition ni entretien inventés
  (« [À COMPLÉTER : …] »), nom avec article (« La robe Odessa »), pièces existantes connues.
- team/rapport.ts (confections en cours et en retard, provisoires, recommandations), team/contenu.ts,
  team/seo.ts, team/service-client.ts (CGV, délais, entretien confié à la créatrice) : plus de série,
  de numérotation, de « fait main à Paris » ni de stock.
- roles/index.ts (« Avant-premières », « Confection », « Logistique » selon les CGV),
  roles/creation.ts, roles/service.ts (une pièce prête qui tarde, 5 à 10 jours ouvrés de livraison).

Assistante
- lib/ai/maison.ts (nouveau) : faits qui font foi : textes officiels TEASING MARQUE et À PROPOS mot
  pour mot (objet marqué officiel), collection et son texte officiel, pièces avec prix et délais,
  création sur demande, numéro de création, étapes exactes, résumé fidèle des CGV (prix, paiement,
  annulation 2 jours, livraison France métropolitaine en 5 à 10 jours ouvrés, retard de 7 jours,
  réclamations 48 h / 14 jours, rétractation, frais de retour à la charge de la cliente, garanties,
  photos non contractuelles), guide des tailles et son statut « à confirmer ».
- lib/ai/brand-context.ts : bloc stable, reconstruit au plus toutes les 5 minutes (voix, faits qui
  font foi et prioritaires sur voice.md, FAQ publiée sans repères « à compléter »).
- lib/ai/structured.ts : règles communes des agents mises au modèle sur demande.
- lib/ai/assistant.ts : rôle, ton, connaissances et limites réécrits ; note de contexte « cliente
  connectée : oui/non » ; mode démonstration aligné (étapes, délais, CGV, rien d'inventé).
- lib/ai/assistant-tools.ts : cartes avec délai et visuel provisoire ; get_piece renvoie null pour
  composition, entretien, mannequin inconnus (consigne de ne pas deviner) ; shipping_options limité à
  la France métropolitaine ; track_order : numéro et e-mail, ou session de la cliente (ses dernières
  commandes) ; étapes, fin de confection estimée, retard ; aucun lien d'accès signé dans la
  conversation ; handoff_to_atelier avec l'e-mail de la session.
- lib/ai/guard.ts : inchangé.
- app/api/assistant/route.ts : session cliente lue côté serveur et transmise.
- components/assistant/Assistant.tsx (composant serveur avec TextsRoot), AssistantLauncher.tsx
  (nouveau), AssistantPanel.tsx : aucun texte en dur (documents « assistante » et « catalogue »).
- content/site/fr/assistante.json (nouveau), content/site/registre/agents-assistante.json (nouveau).

FAQ
- content/site/fr/faq.json (nouveau ; l'identifiant « faq » était déjà déclaré dans base.json) :
  5 thèmes, 25 questions, repères {hauts}, {robes}, {seuil}, {email}, liens [libellé](/adresse),
  « [À COMPLÉTER : …] » pour compositions et entretien.
- content/fr/faq.ts : lit le document, même forme exportée (`faq`) pour la recherche, llms.txt et les
  données structurées ; faqGroups(), faqVars(), plainLinks().
- app/(site)/faq/page.tsx : document « faq », délais lus dans le catalogue, liens, repères marqués
  `mark.todo`, données structurées en texte brut. app/(site)/assistant-ia/** : rien à changer.

Atelier
- app/gestion/page.tsx : indicateur « En confection » (dont en retard), passages des anciens
  identifiants rattachés, bouton « Faire le bilan » du Catalogue, LogList avec
  withRegistryNames([...AGENTS, ...ROLES]).
- app/gestion/rapports/page.tsx : chapeau. equipe/, validations/ : rien à changer (alimentés par
  ROLES et POLICY).

Tests
- tests/unit/roles.test.ts : veille de la confection, message de retard, bilan du catalogue,
  politique sans stock, ancien identifiant.
- tests/unit/guard.test.ts : mise en forme corrigée, nouveaux cas d'injection, fence des constats.
- tests/e2e/assistant.spec.ts : carte « Sur demande », message transmis, étape d'une commande protégée,
  délais, livraison, retours, entretien non inventé.
- tests/e2e/equipe.spec.ts : rôles « Avant-premières » et « Confection », agents Commandes et
  confection et Catalogue, ancien identifiant, propositions dans les Validations.

## Décisions

- Le fichier commandes-stock.ts reste comme renvoi tant que app/api/checkout/route.ts (hors lot)
  l'importe ; l'ancien identifiant reste accepté par runAgent pour vercel.json et l'onglet Commandes.
- Message de retard et confirmation des prix et délais provisoires : propositions à valider (le
  principe argent et irréversible est gardé ; rien n'est affaibli).
- Les propositions déjà faites sont lues dans les Validations : rien n'est proposé deux fois, même
  après une remise à zéro de la mémoire.
- L'assistante ne donne pas le lien de suivi signé : il serait conservé 30 jours dans le journal des
  échanges et le nettoyage typographique peut altérer un jeton ; elle renvoie à /suivi et au compte.
- Livraison : l'assistante et la FAQ suivent l'article 5 des CGV (France métropolitaine, 5 à 10 jours
  ouvrés après la confection) même si les réglages proposent encore l'Europe, l'international et le
  retrait à l'atelier ; une autre destination est confiée à la créatrice.
- Moyens de paiement cités : carte bancaire, PayPal, Google Pay, Apple Pay (communs aux CGV et au site).
- Rétractation : quatorze jours après réception (comme les pages juridiques), frais de retour à la
  charge de la cliente (article 7).
- Textes officiels repris mot pour mot (TEASING et À PROPOS) ; seules corrections : typographie
  française. Aucune faute corrigée.

## Informations à compléter (jamais inventées)

- Compositions des pièces et conseils d'entretien : repères dans la FAQ (questions « matières » et
  « entretien ») ; l'assistante propose alors de transmettre la question.
- Guide des tailles à confirmer (shop.sizeGuide.confirme) : l'assistante le signale.
- Prix provisoires (Sienna, Gaïa, Evina, Kira) et délais provisoires (sept pièces) : proposés à la
  confirmation dans les Validations par l'agent Commandes et confection.

## Suites pour les autres équipes (fichier et correction précise)

1. app/api/checkout/route.ts : `import { runCommandesConfectionAgent } from "@/lib/agents/team/commandes-confection"`,
   appel `runCommandesConfectionAgent("evenement")` et étiquette d'erreur « [agent commandes-confection] » ;
   puis supprimer lib/agents/team/commandes-stock.ts.
2. vercel.json : chemin `/api/cron/commandes-stock` → `/api/cron/commandes-confection` (l'ancien reste
   accepté en attendant).
3. app/gestion/commandes/page.tsx ligne 53 : `atelierApi("/agents/commandes-stock")` →
   `atelierApi("/agents/commandes-confection")`.
4. app/api/gestion/reset/route.ts : ajouter la clé `agents:commandes-confection:memory` (garder
   l'ancienne le temps d'une remise à zéro).
5. components/admin/LogFilter.tsx : option `value="commandes-confection"`, libellé « Commandes et
   confection » (les entrées « commandes-stock » du journal y correspondent).
6. components/admin/ProposalCard.tsx, describe() : cas `send_client_message` (« Objet : … » puis les
   paragraphes du message) et `confirm_piece_terms` (« Pièce : … », « Prix confirmé tel quel »,
   « Délai confirmé tel quel ») ; confirmation avant validation de send_client_message (« Ce message
   part à la cliente. Confirmer ? »).
7. app/gestion/reglages/page.tsx ligne 150 : « rétablit les stocks d'origine » → « rétablit le
   catalogue d'origine ».
8. content/brand/voice.md (documentation-marque) : lignes 10, 34, 41 et 42, 82, 88, 103 à 106 parlent
   encore de pièces cousues à la main à Paris, de séries numérotées, de numéro d'édition et de
   précommandes ; ce texte entre dans chaque requête de l'assistante et des agents (les faits de
   lib/ai/maison.ts priment, mais mieux vaut l'aligner).
9. LEGAL-A-COMPLETER.md : ajouter les deux repères de la FAQ (compositions des pièces ; conseils
   d'entretien de la dentelle, du jersey et du satin).
10. content/settings.ts : shippingRates (Europe, international, retrait à l'atelier) et paymentMethods
    (« Shop Pay », « Paiement en 3 ou 4 fois ») à aligner sur les CGV, ou les CGV à compléter (déjà noté
    par l'équipe juridique).
11. lib/returns-flow.ts lignes 101 et 162 : `kind: "update_stock"` → `"retour-recu"` et
    `"echange-expedie"` (simple étiquette du journal).
12. content/fr/legal.ts, notice « assistant-ia » : elle mentionne une « styliste IA » ; à vérifier.
13. Compte rendu dans docs/equipes/assistant-ia/ (consigne d'équipe) : hors de la liste du lot, à
    recopier par le chef de projet depuis ce fichier.
14. Optionnel : tâche planifiée hebdomadaire `/api/cron/catalogue` (bilan du catalogue) dans vercel.json.

## Vérifications

- npx tsc --noEmit : 0 erreur (ensemble du dépôt).
- npx eslint sur les fichiers du lot : 0 erreur, 0 avertissement.
- npm run audit:tokens : aucun écart.
- npm run audit:ecriture : 519 fichiers, 0 erreur (espaces insécables corrigées sur les seuls
  fichiers du lot, par une copie bornée du contrôle).
- npm run test:unit : 78 tests, 78 réussis.
- Essais hors serveur (jiti, stockage temporaire) : mode démonstration de l'assistante (taille, étape
  protégée, retard, délais, Belgique, retour, annulation, entretien, collection, recherche) et agents
  (Commandes et confection, ancien identifiant, bilan du catalogue, validation d'une confirmation de
  prix et d'un message, rôles Confection, Logistique, Avant-premières, rapport) : résultats conformes.
- Non lancés, comme demandé : next build, Playwright, serveur ; test:db (supabase/ non touché).
