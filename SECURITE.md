# Sécurité — Awrea Paris

Audit de sécurité complet avant la mise en ligne, réalisé le 13 octobre 2026 sur la branche
`claude/awrea-site` (version de production compilée et servie localement, en mode
démonstration). Ce document décrit chaque protection en place, les résultats des contrôles, les
failles trouvées et corrigées pendant l'audit, et **ce qui reste à faire par la maison** (réglages
de comptes que le code ne peut pas faire à sa place).

---

## Synthèse

| Domaine | État | Détail |
| --- | --- | --- |
| HTTPS, certificat, domaine unique | ✓ code prêt · ⚠ à activer | Vercel fournit et renouvelle le certificat ; redirection www ↔ sans www dans `next.config.ts` ; HSTS deux ans avec préchargement. Inscription à hstspreload.org après la mise en ligne (§ 11). |
| En-têtes de sécurité | ✓ | CSP stricte à nonce, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP. Objectif A+ sur securityheaders.com. |
| Pare-feu et anti-DDoS | ✓ automatique · ⚠ règles à créer | Protection DDoS de Vercel active d'office ; règles du pare-feu recommandées au § 3. |
| OWASP Top 10 | ✓ | Validation stricte de toutes les entrées (Zod), requêtes paramétrées, échappement React, contrôle d'origine contre le CSRF, aucune requête serveur vers une adresse fournie par l'internaute. |
| Anti-robots et limitation de débit | ✓ | Turnstile sur tous les formulaires publics et la connexion à l'Atelier ; limitation de débit partagée entre instances ; blocage après 8 échecs de connexion en 15 minutes. |
| Authentification | ✓ | Clientes : Supabase sans mot de passe (code e-mail, Google, Apple), sessions qui expirent. **Double authentification obligatoire pour tous les accès admin et le tableau de bord Atelier.** |
| Base de données | ✓ | Sécurité par ligne (RLS) sur toutes les tables, vérifiée par des tests. |
| Paiement | ✓ | **Aucune donnée bancaire stockée sur le site : tout le paiement passe par Shopify et ses prestataires certifiés PCI-DSS.** |
| Sauvegardes | ✓ code prêt · ⚠ secrets à créer | Sauvegarde quotidienne chiffrée (AES-256) avec test de restauration automatique. |
| Secrets | ✓ | **Toutes les clés (Shopify, Supabase, Claude, e-mails) uniquement dans les variables d'environnement, jamais dans le code ni sur GitHub.** Recherche automatique de clés à chaque modification. |
| Dépendances | ✓ | Dependabot chaque semaine, `npm audit` bloquant en intégration continue : 0 vulnérabilité en production. |
| Dépôt GitHub | ⚠ **à faire** | Le dépôt est aujourd'hui **public** et la branche `main` **n'est pas protégée** (§ 11). |
| Sécurité de l'IA | ✓ | Moindre privilège, protection contre l'injection de prompt, aucun accès aux données bancaires ni aux mots de passe. |
| Surveillance | ✓ | Contrôle quotidien (certificat, en-têtes, vulnérabilités, tentatives d'intrusion), journal des connexions, alerte en cas de connexion inhabituelle. |

---

## 1. Connexion chiffrée

- **Certificat SSL/TLS** : émis et renouvelé automatiquement par Vercel (Let's Encrypt) pour le
  domaine et ses sous-domaines déclarés. TLS 1.2 minimum, TLS 1.3 privilégié, suites modernes.
- **HTTP → HTTPS** : forcé par Vercel sur tous les domaines personnalisés (redirection 308).
- **Une seule version du site** : l'hôte de `NEXT_PUBLIC_SITE_URL` (par défaut
  `https://www.awreaparis.com`) fait foi ; l'autre version (avec ou sans « www ») y est redirigée
  de façon permanente (`next.config.ts`). À doubler dans Vercel → Domains (§ 11).
- **HSTS** : `max-age=63072000; includeSubDomains; preload` sur tous les déploiements Vercel.
- **Contenu mixte** : aucun — toutes les ressources sont servies en HTTPS (site, Shopify CDN) et
  la CSP ajoute `upgrade-insecure-requests`.
- Objectif **A+ sur SSL Labs** : atteint avec la configuration TLS de Vercel et HSTS ; à vérifier
  dès la mise en ligne sur ssllabs.com/ssltest (le contrôle quotidien vérifie déjà le certificat).

## 2. En-têtes de sécurité

Valeurs servies par la version de production (relevées pendant l'audit) :

| En-tête | Valeur |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' (+ domaines des services autorisés); style-src 'self' 'unsafe-inline'; img-src …; font-src 'self'; media-src 'self' blob: cdn.shopify.com; connect-src …; frame-src challenges.cloudflare.com …; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (déploiements Vercel) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-Powered-By` | supprimé |

**Politique de sécurité du contenu stricte.** Chaque page reçoit un *nonce* aléatoire unique
(`proxy.ts`) ; seuls les scripts qui le portent s'exécutent, ainsi que ceux qu'ils chargent
eux-mêmes (`strict-dynamic` : mesure d'audience après consentement, Turnstile). Aucun
`unsafe-inline` pour les scripts : un script injecté dans une page ne s'exécuterait pas. Les
attributs `style` restent autorisés (variables CSS des animations), sans risque d'exécution.

Contrepartie : les pages sont rendues à chaque visite au lieu d'être servies depuis le cache du
CDN (les données Shopify restent, elles, en cache cinq minutes). Si un jour le trafic l'exige,
`CSP_MODE=static` rétablit les pages en cache avec une CSP qui tolère les scripts en ligne de
Next.js (note A au lieu de A+ sur securityheaders.com). Le choix est expliqué dans
`lib/security/headers.ts`.

Contrôle pendant l'audit : 23 pages visitées sur la version de production, **aucune violation de
la CSP** ; recherche, panier, commande, compte, assistante et Atelier fonctionnent sous CSP
stricte (263 tests de parcours au vert).

## 3. Pare-feu, attaques et OWASP Top 10

**Anti-DDoS** : Vercel atténue automatiquement les attaques par déni de service sur tous les
plans. **Règles de pare-feu recommandées** (Vercel → Firewall, à créer par la maison) :

1. *Attack Challenge Mode* à activer en cas d'attaque (bouton d'urgence).
2. Bloquer les chemins de scanners : `/wp-admin`, `/wp-login.php`, `/.env`, `/.git`, `/xmlrpc.php`,
   `/phpmyadmin` (le site n'en a aucun).
3. Limiter le débit sur `/api/*` : 120 requêtes par minute et par adresse IP (en plus des
   limites internes de l'application).
4. Bloquer les réseaux signalés par le contrôle quotidien (`suspiciousNetworks`).

| Risque OWASP (2021) | Protection |
| --- | --- |
| A01 Contrôle d'accès | `proxy.ts` n'ouvre l'Atelier que par son adresse secrète (`ADMIN_PATH`), `/gestion` et `/api/gestion` répondent 404 ; chaque route d'administration revérifie la session ; RLS sur toutes les tables ; les données d'une cliente ne sont lues qu'avec sa session (et l'e-mail correspondant pour le suivi de commande). |
| A02 Cryptographie | HTTPS partout ; sessions signées HMAC-SHA256 ; secret TOTP chiffré AES-256-GCM ; codes de secours hachés ; comparaisons en temps constant. |
| A03 Injection | Requêtes Supabase paramétrées, aucune requête SQL construite à la main ; toutes les entrées validées par des schémas Zod (longueurs, formats) ; échappement automatique de React ; trois seuls `dangerouslySetInnerHTML`, tous sur du contenu de confiance (script de `<head>`, QR code généré par le serveur, JSON-LD échappé). |
| A04 Conception | Règle d'autonomie des agents centralisée (`lib/agents/policy.ts`) : argent et irréversible toujours validés par la créatrice. |
| A05 Configuration | En-têtes stricts ; aucune valeur par défaut dangereuse en production (voir § 10) ; mode démonstration impossible sur le site de production. |
| A06 Composants vulnérables | Dependabot, `npm audit` bloquant en intégration continue, contrôle quotidien. |
| A07 Authentification | Double authentification obligatoire pour l'Atelier, blocage après 8 échecs, Turnstile, sessions de 12 h révocables ; clientes sans mot de passe. |
| A08 Intégrité | Webhooks Shopify signés (HMAC) et rejoués sans effet (identifiant de livraison mémorisé) ; tâches planifiées authentifiées (`CRON_SECRET`, comparaison en temps constant). |
| A09 Journalisation | Journal des actions des agents, journal de sécurité des connexions, compteurs des requêtes refusées, alerte par e-mail. |
| A10 SSRF | Aucune requête serveur vers une adresse fournie par l'internaute. |

**CSRF** : cookies de session `SameSite` (Lax pour les clientes, Strict pour l'Atelier) et, en
profondeur, toute requête d'API qui modifie des données en annonçant une autre origine est
refusée (403) par `proxy.ts` — hors webhooks signés et tâches planifiées.

**Anti-robots** : Cloudflare Turnstile (invisible pour les humaines) sur la newsletter, le
contact et les rendez-vous, la liste d'attente, la connexion des clientes, la rétractation en
ligne et la connexion à l'Atelier. **Limitation de débit** partagée entre instances (Upstash) sur
les formulaires, la connexion, l'assistante et les preuves de consentement.

## 4. Authentification et sessions

**Clientes** (Supabase Auth) : sans mot de passe — code à usage unique par e-mail (6 chiffres,
valable 10 minutes), Google ou Apple. Jeton d'accès d'une heure renouvelé automatiquement,
jeton de renouvellement à usage unique, session limitée à 30 jours et fermée après 7 jours sans
visite (`supabase/config.toml`, à reporter dans le projet hébergé — les deux derniers réglages
demandent le plan Pro de Supabase).

**Atelier et éditeur visuel : strictement invisibles pour le public.**

- **Adresse non devinable** : l'Atelier ne s'ouvre que par `ADMIN_PATH` (`/prive-` suivi d'au moins
  douze caractères tirés au hasard), réécrite par `proxy.ts` vers les routes internes `/gestion` et
  `/api/gestion`. Ces routes internes répondent 404, comme toute adresse inconnue ; en production,
  sans `ADMIN_PATH` valable, l'Atelier reste fermé.
- **Aucun lien depuis le site**, aucune adresse dans les fichiers servis au public (l'adresse est
  transmise aux seuls composants de l'Atelier, jamais par une variable publique).
- **Exclu des moteurs** : `X-Robots-Tag: noindex, nofollow, noarchive` sur toutes les réponses de
  l'Atelier, balise `robots` équivalente, `robots.txt` qui écarte `/prive-` et `/gestion` (le
  préfixe seul, jamais l'adresse complète), aucune mise en cache partagée, aucun référent transmis.
- **Comptes autorisés** (`ATELIER_ACCOUNTS`) : chacun a son mot de passe personnel (scrypt) et sa
  **double authentification obligatoire** (TOTP RFC 6238, fenêtre ±30 s, anti-rejeu, 8 codes de
  secours à usage unique). Le mot de passe d'installation (`ATELIER_PASSWORD`) ne sert qu'à la
  première connexion d'un compte. Turnstile sur le formulaire.
- **Blocage** : cinq échecs (mot de passe ou code) bloquent une adresse une demi-heure, même
  inconnue (rien ne révèle quels comptes existent), et préviennent la titulaire par e-mail ; huit
  échecs par quart d'heure bloquent l'adresse IP.
- **Alerte à chaque connexion** : un e-mail part vers la titulaire du compte (copie à
  `SECURITY_ALERT_EMAIL`), avec l'appareil, le réseau tronqué, le lieu approximatif, et un lien
  « Ce n'était pas moi » qui ferme toutes les sessions et remet le compte à zéro. Une connexion
  depuis un appareil ou un réseau inconnu depuis 90 jours est signalée comme inhabituelle.
- **Brouillons jamais publics** : les modifications non publiées de l'éditeur ne sont rendues qu'en
  mode Édition, après connexion à l'Atelier ; le site public ne lit que les versions publiées.

Session de 12 h (cookie `HttpOnly`, `Secure`, `SameSite=Strict`) ; « Déconnecter tous les
appareils », la remise à zéro d'un compte et le lien « Ce n'était pas moi » ferment aussitôt
toutes les sessions ouvertes. Aucun mot de passe de démonstration n'est accepté en production.

**Contrôlé à chaque audit** par l'Agent Sécurité (`/api/cron/security`, `scripts/security-check.mjs`,
bilan de maintenance) : adresse secrète réglée et valable, comptes autorisés avec mot de passe et
double authentification, routes internes en 404, `robots.txt` sans l'adresse, page de connexion en
`noindex`, adresse absente des pages publiques, blocages et connexions inhabituelles du jour.

**Journal des connexions** (Atelier › Réglages › Sécurité) : chaque tentative est consignée
(succès, échec du mot de passe ou du code, blocage) avec la famille d'appareil et le réseau
tronqué (minimisation RGPD).

### Site privé avant l'ouverture

Tant que `SITE_PRIVE=1` (`lib/security/private-site.ts`, `proxy.ts`), une visiteuse sans session de
l'Atelier ne voit que la page d'attente `/acces-prive`, sans en-tête, menu ni contenu ; les API
publiques répondent 404 (sauf webhooks et tâches planifiées, authentifiés autrement) ; `robots.txt`
ferme tout, le plan du site et `llms.txt` sont vides, et chaque réponse porte `X-Robots-Tag:
noindex`. La créatrice connectée (session de l'Atelier, double authentification) voit tout le site.
Contrôlé par `tests/e2e/site-prive.spec.ts` (serveur lancé avec `SITE_PRIVE=1`) et
`tests/unit/site-prive.test.ts`.

## 5. Données

- **Sécurité par ligne (RLS) partout** : les 14 tables de la base clientes sont protégées ; une
  cliente ne lit et ne modifie que ses propres données ; seules des colonnes précises sont
  modifiables. Vérifié par `npm run test:db` (PostgreSQL embarqué) et à chaque test de
  restauration (une table sans RLS fait échouer la sauvegarde).
- **Minimisation** : adresses IP jamais conservées au-delà des fenêtres de limitation (sauf
  réseau tronqué dans le journal de sécurité) ; navigation enregistrée seulement avec accord ;
  purge automatique des données expirées.
- **Paiement** : **aucune donnée bancaire stockée sur le site : tout le paiement passe par
  Shopify et ses prestataires certifiés PCI-DSS.** Même le tunnel de démonstration ne transmet
  jamais de numéro de carte au serveur (seule l'issue simulée est envoyée).
- **Sauvegardes quotidiennes chiffrées** (`.github/workflows/backup.yml`) : export de la base
  clientes et du stockage technique, chiffrement AES-256, puis **test de restauration
  automatique** dans une base vierge (tables présentes, RLS active, données lisibles). Conservation
  30 jours, copie hors site facultative (Cloudflare R2 / S3).

**Restaurer une sauvegarde** :

1. Télécharger l'artefact `sauvegarde-…` (GitHub → Actions → Sauvegarde chiffrée) ou la copie R2.
2. Déchiffrer : `gpg --decrypt --output base-public.dump base-public.dump.gpg` (phrase secrète
   `BACKUP_PASSPHRASE`, conservée hors ligne par la maison).
3. Base clientes : `pg_restore --no-owner --no-privileges -d "$SUPABASE_DB_URL" base-public.dump`
   (dans un nouveau projet Supabase : appliquer d'abord `supabase/migrations`, restaurer les
   comptes avec `psql "$SUPABASE_DB_URL" -f base-auth.sql`, puis les données).
4. Stockage technique : `node scripts/restore-kv.mjs stockage.json --confirmer`.

## 6. Secrets

**Toutes les clés (Shopify, Supabase, Claude, e-mails) uniquement dans les variables
d'environnement, jamais dans le code ni sur GitHub.** La liste complète, sans valeurs, est dans
`.env.example` ; `.env*` est ignoré par git (sauf le modèle).

- `node scripts/secret-scan.mjs` cherche les motifs de clés (Anthropic, Shopify, Supabase,
  Resend, Brevo, Klaviyo, AWS, GitHub, clés privées) dans tous les fichiers suivis, à chaque
  modification (intégration continue) et chaque semaine. Historique git vérifié pendant l'audit :
  aucune clé.
- La clé de service Supabase n'est jamais exposée au navigateur (aucun préfixe `NEXT_PUBLIC_`).
- **En cas de fuite d'une clé** : la révoquer immédiatement chez le fournisseur, en créer une
  nouvelle, la remplacer dans Vercel (et GitHub si elle y est utilisée), redéployer. Pour
  `SESSION_SECRET` : toutes les sessions et la double authentification sont à refaire.

## 7. Code, dépendances, dépôt

- **Dependabot** (`.github/dependabot.yml`) : mises à jour groupées chaque lundi (npm et actions).
- **Intégration continue** (`.github/workflows/ci.yml`) : recherche de clés, `npm audit
  --omit=dev --audit-level=high`, lint, types, homogénéité du design, tests unitaires, tests de la
  base, compilation et plus de 260 tests de parcours (bureau et mobile). Rien n'est fusionné sans vert.
- **État des dépendances** : 0 vulnérabilité dans les dépendances de production. 5 alertes
  « élevées » dans l'outillage de développement (`braces` via `eslint-config-next`) : elles ne
  concernent que l'analyse de code en local, jamais le site ; la correction proposée par npm
  rétrograderait l'outil de plusieurs versions — Dependabot appliquera le correctif publié en amont.
- **Dépôt GitHub privé, branche principale protégée** : à faire par la maison (§ 11).

## 8. Sécurité de l'IA

**Moindre privilège.** Le modèle ne reçoit jamais de clé ni d'accès direct aux services : il ne
voit que les données explicitement préparées pour sa tâche, et ne peut que proposer des actions
d'une liste fermée, validées par des schémas, puis exécutées par le code selon la règle
d'autonomie (`lib/agents/policy.ts`).

| Agent | Données visibles | Actions possibles |
| --- | --- | --- |
| Assistante (clientes) | Catalogue, guide des tailles, livraison ; une commande seulement si l'e-mail et le numéro correspondent | Répondre ; transmettre une demande à l'atelier |
| Catalogue | Photos et notes de la créatrice | Publier ou mettre à jour une fiche |
| Service client | Le message reçu, la commande citée (si l'e-mail correspond), le catalogue | Répondre aux questions courantes ; brouillon et escalade ; **proposer** un remboursement |
| Commandes et stock | Commandes et stocks | Mettre à jour un stock, prévenir la liste d'attente, signaler ; **proposer** une annulation |
| SEO et visibilité IA | Catalogue et pages publiques | Textes SEO, articles du Journal, llms.txt |
| Contenu | Catalogue et collection | Brouillons de posts et de lettres ; **proposer** l'envoi à toute la liste |
| Rapport | Chiffres agrégés (ventes, sources, audience) | Envoyer le rapport à la créatrice |

**Aucun agent n'a accès aux données bancaires ni aux mots de passe** : les paiements restent chez
Shopify (une commande ne contient que le libellé du moyen de paiement) ; les clientes n'ont pas de
mot de passe ; celui de l'Atelier n'existe que dans une variable d'environnement, comparé par le
serveur et jamais transmis à un modèle.

**Protection contre l'injection de prompt : les messages des visiteuses et le contenu des e-mails
ne peuvent jamais modifier les instructions des agents ni déclencher d'actions sensibles.**
Défense en profondeur, indépendante du modèle (`lib/ai/guard.ts`, tests `npm run test:unit`) :

1. tout contenu externe est enfermé dans une balise nommée et présenté comme une donnée ; une
   balise fermante imitée est neutralisée ;
2. un message qui contient des consignes adressées au modèle (« ignore les instructions »,
   rôles, balises, demande de révéler le prompt…) n'obtient **jamais** de réponse automatique :
   il est relu par la créatrice ;
3. une réponse envoyée sans relecture ne peut contenir que des liens vers le site et les
   transporteurs, ni adresse e-mail ni numéro de téléphone étrangers à la maison (pas de relais
   d'hameçonnage) ; deux réponses automatiques par jour au plus pour une même adresse ;
4. les actions qui touchent à l'argent ou sont irréversibles exigent toujours la validation de
   la créatrice : aucun texte ne peut les débloquer.

Un test de parcours vérifie qu'un message piégé est bien escaladé et jamais répondu
automatiquement.

## 9. Surveillance

- **Chaque jour**, l'agent de maintenance lance `scripts/security-check.mjs` : validité du
  certificat (alerte sous 21 jours), redirections HTTPS et domaine unique, en-têtes et CSP,
  vulnérabilités des dépendances, et journal interne des 24 dernières heures
  (`/api/cron/security` : échecs et blocages de connexion, connexions inhabituelles, requêtes
  d'origine étrangère, excès de débit, réglages manquants). Il corrige ce qui peut l'être et
  alerte sinon (JOURNAL.md, tableau de bord Atelier).
- **Chaque semaine** : `.github/workflows/securite.yml` (clés, dépendances, site en ligne).
- **En continu** : alerte e-mail à chaque connexion inhabituelle à l'Atelier.

## 10. Résultats de l'audit

**Contrôles exécutés** (13 octobre 2026) :

| Contrôle | Résultat |
| --- | --- |
| Parcours complets sur la version de production, CSP stricte | 263/263 après corrections (bureau et mobile ; 3 échecs trouvés puis corrigés) |
| Violations de CSP sur 23 pages | 0 |
| Clés secrètes dans les fichiers suivis et l'historique git | 0 |
| `npm audit --omit=dev` | 0 vulnérabilité |
| Tests unitaires des garde-fous IA | 3/3 |
| Sécurité par ligne de la base clientes | tous les scénarios au vert |
| Routes d'API : session vérifiée, entrées validées | toutes (2 corrections, ci-dessous) |
| Lint et types | 0 erreur |

**Failles trouvées et corrigées pendant l'audit** :

| Gravité | Faille | Correction |
| --- | --- | --- |
| Critique | Sans `SESSION_SECRET`, les sessions étaient signées avec une valeur de développement publique (dépôt public) : une session Atelier aurait pu être fabriquée. | Sur Vercel, aucune valeur par défaut : sans clé de 32 caractères, les sessions sont refusées et l'Atelier reste fermé (`lib/auth/session.ts`). Même règle pour le chiffrement TOTP. |
| Élevée | Sans `ATELIER_PASSWORD` ni Shopify, le mot de passe de démonstration était accepté — une inconnue aurait pu s'enrôler la première en double authentification. | Jamais de mot de passe de démonstration sur le site de production. |
| Moyenne | L'enrôlement de la double authentification n'était pas limité en tentatives. | Même limite que la connexion (8 échecs / 15 min), échecs journalisés. |
| Moyenne | Les sessions de l'Atelier n'étaient pas révocables avant leur expiration. | Génération de session : déconnexion de tous les appareils, révocation à la réinitialisation de la double authentification. |
| Faible | Le tunnel de démonstration envoyait le numéro de carte de test au serveur. | Seule l'issue simulée quitte le navigateur. |
| Faible | La route des e-mails automatiques ne revérifiait pas la session (protégée par `proxy.ts` seulement). | Vérification ajoutée (défense en profondeur). |

## 11. À faire par la maison

Ces réglages relèvent des comptes de la maison ; le code ne peut pas les faire à sa place.

1. **Rendre le dépôt GitHub privé** : GitHub → dépôt → Settings → General → *Danger Zone* →
   *Change visibility* → Private. (Aucune clé n'a jamais été publiée, mais le code n'a pas à
   être public.)
2. **Protéger la branche `main`** : Settings → Branches → *Add rule* (ou *Rulesets*) pour `main` :
   exiger une demande de fusion, exiger le passage au vert de « Intégration continue », interdire
   les poussées forcées et la suppression. Activer *Secret scanning* et *Push protection*
   (Settings → Code security).
3. **Double authentification sur tous les comptes** : GitHub, Vercel, Shopify (et comptes du
   personnel), Supabase, Cloudflare, Anthropic, Resend/Brevo.
4. **Variables d'environnement** (Vercel) : au minimum `SESSION_SECRET` (64 caractères aléatoires),
   `ATELIER_PASSWORD`, `CRON_SECRET`, `SECURITY_ALERT_EMAIL`, les clés Turnstile, puis les services
   (`.env.example`). Jeton Shopify Admin avec les seules autorisations : `write_products`,
   `write_inventory`, `read_locations`, `write_orders`, `write_customers`.
5. **Domaine** : Vercel → Domains → ajouter `awreaparis.com` et `www.awreaparis.com`, rediriger
   l'un vers l'autre (308) ; après une semaine sans incident, inscrire le domaine sur
   hstspreload.org.
6. **Pare-feu Vercel** : créer les règles du § 3.
7. **Supabase** : région Union européenne, réglages d'authentification de `supabase/config.toml`,
   restriction réseau de la base si disponible, et sauvegardes du plan Pro en complément.
8. **Sauvegardes** : créer les secrets GitHub `BACKUP_PASSPHRASE` (phrase longue, conservée hors
   ligne, par exemple dans un gestionnaire de mots de passe), `SUPABASE_DB_URL`,
   `KV_REST_API_URL`, `KV_REST_API_TOKEN` (et la copie R2 si souhaitée). Exercice de restauration
   manuel une fois par trimestre (procédure au § 5).
9. **Vérifications après la mise en ligne** : ssllabs.com/ssltest et securityheaders.com
   (objectif A+ pour les deux), puis lancer « Sécurité » dans GitHub Actions.
