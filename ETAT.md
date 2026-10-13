# ÉTAT — audit de l'existant face au cahier des charges complet

> Audit du 13 octobre 2026 (soir), mis à jour en fin de phase A, à la reprise sur le « cahier des charges complet », désormais la
> référence unique. Légende : ✅ fait et gardé · 🔧 à corriger · ❌ manquant. Mis à jour à chaque fin
> d'étape. L'état d'avant la nouvelle direction artistique est sauvegardé sur la branche
> `archive/avant-nouvelle-da`.

## 0. Mode de travail

| Point | État |
| --- | --- |
| Autonomie, décisions notées | ✅ `DECISIONS.md` (décisions antérieures reprises dedans) |
| Adaptateurs réel / simulé, site complet sans clé | ✅ commerce (Shopify / démo), base clientes (Supabase / stockage local), e-mails (Resend / boîte simulée), lettres (Brevo, Klaviyo / envoi du site), IA (Claude / réponses simulées), Turnstile, stockage (Upstash / fichier), Instagram ; ✅ interrupteurs `*_PROVIDER` (`lib/config/providers.ts`), état visible dans l'Atelier › Réglages |
| `.env.example` commenté | ✅ avec les interrupteurs |
| `ACTIVATION.md` | ✅ 13 étapes, dans l'ordre, pour une non-développeuse |
| `ETAT.md`, `PLAN.md` priorisé | ✅ |
| Commits fréquents, branche par grand chantier | 🔧 commits réguliers sur `claude/awrea-site` ; branches de chantier à partir de maintenant |

## 1. La marque

| Point | État |
| --- | --- |
| `MARQUE.md` | ✅ univers, pièces de la collection, rubriques Instagram et leur place sur le site, logo, mouvement |

## 2. Direction artistique

| Point | État |
| --- | --- |
| Palette sans doré | ✅ tokens, CSS, e-mails, signatures (halo blanc, fil blanc du drapé), texture de dentelle neutre |
| Instrument Serif + Inter Tight, ni calligraphie ni italique | ✅ polices servies par le site (`styles/fonts`, `next/font/local`) |
| Logo provisoire SVG noir et blanc | ✅ vectorisé (`scripts/build-logo.py`), fichiers noir / blanc, favicon, icônes |
| Épuré et luxueux | ✅ (règles appliquées) |
| Tendances 2026 | ✅ en grande partie (vidéo, mode Nuit, coulisses, micro-interactions, éco-conception) |
| Justification régulière | ✅ équilibreur par paragraphe, mesure 60–70 caractères, contrôle automatique |
| Homogénéité (8 px, 1,6, marges) | ✅ contrôle automatique ; ✅ une durée et une courbe pour toutes les animations (contrôlé par l'audit) |
| Responsive 320 → 2560 px | 🔧 testé de 360 à 1920 px ; ❌ 320 et 2560 px ; ❌ barre d'achat fixe sur mobile |

## 3. Processus de design multi-agents

| Point | État |
| --- | --- |
| Veille + liste noire | ✅ `docs/equipes/design/liste-noire.md`, arbitrages |
| Trois directions artistiques | 🔧 lancées ; interrompues par la limite d'utilisation — à relancer une par une |
| Critique, gardien, fusion, `DESIGN.md` | ❌ |
| Touches personnelles (dentelle, croquis, monogramme décliné, numéros, détail inattendu) | 🔧 partielles (numéros d'édition, texture de dentelle, croquis de l'atelier) |

## 4. Interactions signature

| # | Interaction | État |
| --- | --- | --- |
| 1 | Écran d'ouverture (monogramme au trait noir) | ❌ |
| 2 | Halo de lumière blanche | ✅ |
| 3 | Révélation en dentelle de la vidéo d'accueil | ✅ |
| 4 | Transitions drapées ; transition grille → fiche (View Transitions) | ✅ drapé ; ❌ View Transitions |
| 5 | Lettre de la créatrice au scroll | ✅ (Instrument Serif) |
| 6 | Numéros d'édition, pièces restantes | ✅ |
| 7 | Loupe dentelle | ✅ |
| 8 | Vue 360° | ❌ |
| 9 | Shop the look | ✅ |
| 10 | Enveloppe de confirmation | ✅ |
| 11 | Alternance claire / sombre | ✅ |
| 12 | Ambiance selon l'heure de Paris | ❌ |
| 13 | Ambiance sonore optionnelle | ❌ |
| 14 | Vibrations à l'ajout au panier | 🔧 à vérifier / compléter |

## 5. Stack

| Point | État |
| --- | --- |
| Next.js, TS, Tailwind, GSAP, Lenis, OGL | ✅ |
| Shopify / Supabase / Claude derrière adaptateurs | ✅ |
| Sentry | ❌ (adaptateur + simulation) |
| Klaviyo / Brevo | ✅ adaptateur (`lib/marketing/provider`) |
| CMS simple (textes et images modifiables) | ❌ |
| Régénération des pages par webhooks | ✅ catalogue Shopify ; 🔧 contenus (avec le CMS) |

## 6. Pages

✅ Accueil, Collections (+ page par collection, moodboard), Boutique (filtres, recherche plein écran),
Fiche produit, Silhouettes (= Outfits), La Maison, L'Atelier, Journal, Presse, Contact (rendez-vous par
formulaire), FAQ, Livraison et retours, « Bientôt », 404, pages légales, compte, liste d'envies,
certificat, avis.
🔧 Collections : « film de collection en chapitres » à faire ; Boutique : grille éditoriale
asymétrique ; Presse : kit presse téléchargeable à vérifier ; renommer Silhouettes en Outfits.
❌ Lookbook feuilletable et PDF, Archives (« Pièce adoptée »), Sur mesure, Le Cercle, Rendez-vous
(page dédiée et agenda), Points de vente et pop-up, Guide des tailles (page), Entretien des matières,
Glossaire, Suivi de commande sans compte, page de maintenance, Déclaration d'accessibilité, Plan du
site.
Fiche produit : ✅ galerie, vidéo, loupe, numéro, prix, tailles, « Trouver ma taille », matières,
« Fait main à Paris », compléter le look, avis, envies, alerte de retour ; ❌ vue 360°, fiche de
traçabilité, partage, barre d'achat fixe sur mobile.

## 7. E-commerce et logistique

| Point | État |
| --- | --- |
| Panier latéral, tunnel court sans compte, carte, Apple Pay / Google Pay / PayPal, 3 ou 4 fois (simulés) | ✅ — ❌ suggestions complémentaires dans le panier, Shop Pay |
| Autocomplétion d'adresse | ❌ (adaptateur + simulation) |
| Stocks par taille, liste d'attente, précommande, numéros d'édition | ✅ |
| Livraison France / international | 🔧 Colissimo, Chronopost, DHL ; ❌ Mondial Relay, retrait à l'atelier, droits et taxes calculés à l'avance, date de livraison d'un cadeau |
| Retours et échanges en libre-service avec étiquette | ❌ (rétractation en ligne seulement) |
| Factures PDF conformes, export comptable mensuel | ❌ |
| Emballage cadeau, message ; prix masqué sur le bordereau | ✅ / ❌ |
| Codes, cartes cadeaux / parrainage | ✅ / ❌ |
| Demande de sur-mesure + devis | ❌ |
| Compte cliente complet | ✅ — 🔧 suivi, retours, préférences de communication à vérifier |

## 8. Base clientes

✅ Supabase / démo, comptes e-mail, Google, Apple, profils, tailles, adresses, historique, envies,
attentes, consentements, navigation consentie, segments, RGPD, RLS. ❌ export CSV depuis l'Atelier.

## 9. Certificat et Cercle

✅ certificats, QR, page, rattachement, impression avec étiquette ; ❌ génération des QR en lot.
🔧 Cercle : adhésion dans le compte ; ❌ page du Cercle, statut VIP visible, invitations, avant-premières
des croquis. ✅ ventes privées (drops). ❌ rendez-vous synchronisés à un agenda.

## 10. Assistant IA et styliste

✅ assistante (simulée sans clé), garde-fous, transfert à l'atelier, mention IA. 🔧 styliste par
photo d'inspiration à vérifier ; bulle flottante à remplacer (liste noire).

## 11. Agents de gestion

✅ six agents + maintenance quotidienne, validations pour l'argent et l'irréversible, journal,
tableau de bord à double authentification.

## 12. Équipes d'agents

✅ 34 agents dans `.claude/agents/`, `docs/EQUIPES.md`. Équipes à faire travailler une par une
(limites d'utilisation).

## 13. Cookies

✅

## 14. SEO et visibilité IA

✅ balisage, H1 unique, métadonnées, fil d'Ariane, canoniques, sitemap, robots (robots des IA
autorisés), Open Graph, données structurées, llms.txt, flux Merchant / Meta, mesure d'audience et
pixels après consentement, Microsoft Clarity et pixel TikTok. ❌ hreflang EN (pas de version anglaise),
LocalBusiness, images de partage par pièce.

## 15. E-mails

✅ confirmation, bienvenue, panier abandonné, après-achat avec entretien, demande d'avis, retour en
stock, anniversaire, relance. ❌ expédition, livraison, navigation abandonnée, invitations du Cercle,
double confirmation de la newsletter, liens WhatsApp / message Instagram.

## 16. Sécurité

✅ (voir `SECURITE.md`). 🔧 dépôt public et branche principale non protégée : action de la maison
(`ACTIVATION.md`).

## 17. Juridique

✅ pages légales complètes, cases d'acceptation, `LEGAL-A-COMPLETER.md`. ❌ conditions du Cercle et
du parrainage (page dédiée), déclaration d'accessibilité, Sentry et Cloudflare parmi les prestataires,
mention de relecture par un professionnel à renforcer.

## 18. International, accessibilité, performance

❌ version anglaise et devises affichées (seule la préférence de devise existe), sélecteur.
🔧 WCAG 2.1 AA testé → viser 2.2 AA ; sous-titres des vidéos. 🔧 images AVIF / WebP (WebP),
préchargement au survol, zéro décalage ; ❌ budget de poids par page, PWA (manifeste seul, ni service
worker ni notifications). ✅ empreinte écologique dans le pied de page.

## 19. Qualité et tests

✅ tests unitaires, base, Playwright (parcours, accessibilité, responsive, homogénéité), intégration
continue. ❌ tests visuels de non-régression ; 🔧 prévisualisation (Vercel Preview documenté) ;
❌ `REVUE.md`.

## 20. Documentation

✅ README, `LEGAL-A-COMPLETER.md`, `SECURITE.md`, `JOURNAL.md`, `ACTIVATION.md`, `DECISIONS.md`.
❌ `GUIDE-CREATRICE.md`, `DESIGN.md`.
