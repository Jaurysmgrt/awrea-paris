/**
 * Index de recherche : pièces, collections, Journal, pages de la maison et réponses de la FAQ.
 * Construit côté serveur (catalogue Shopify ou démonstration), servi en un seul fichier léger
 * à la recherche plein écran, qui filtre ensuite instantanément dans le navigateur.
 */
import "server-only";
import { getPublicProducts, getCollections } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";
import { leadTimeText } from "@/lib/commerce/availability";
import { faq } from "@/content/fr/faq";
import { getDoc } from "@/lib/edition/read";
import type { Locale } from "@/lib/i18n/routing";
import { normalize, type SearchEntry } from "./match";
import type { Image } from "@/lib/commerce/types";

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, s.lastIndexOf(" ", n)).replace(/[,;:.]$/, "")}…` : s);

type PageEntry = { href: string; title: string; note: string; extra: string };

/**
 * Pages de la Maison : leur légende est la description (seo) de leur document de contenu, la même
 * que celle des moteurs de recherche ; `extra` ajoute des mots que la visiteuse pourrait taper.
 */
const PAGE_DOCS: { doc: string; href: string; title: string; extra: string }[] = [
  { doc: "la-maison", href: "/la-maison", title: "La Maison", extra: "creatrice histoire contrastes dentelle drapes dorure a propos" },
  { doc: "atelier", href: "/atelier", title: "L’Atelier", extra: "savoir faire dorure coupe couture artisans francais fabrication sur demande coulisses essayage" },
  { doc: "sur-commande", href: "/sur-commande", title: "La commande sur demande", extra: "sur commande sur demande delai fabrication etapes confection suivi sans stock" },
  { doc: "guide-des-tailles", href: "/guide-des-tailles", title: "Guide des tailles", extra: "taille mesures tour de poitrine taille hanches xs s m l xl" },
  { doc: "rendez-vous", href: "/rendez-vous", title: "Prendre rendez-vous", extra: "rendez vous essayage taille sur mesure visio appel video prive conseil creatrice" },
  { doc: "outfits", href: "/outfits", title: "Outfits", extra: "look tenue complete silhouette outfit" },
  { doc: "contact", href: "/contact", title: "Contact", extra: "contact ecrire message question conseil" },
  { doc: "presse", href: "/presse", title: "Presse", extra: "dossier de presse journaliste contact presse" },
];

/** Pages de service, sans document de contenu propre. */
const pages: PageEntry[] = [
  { href: "/faq", title: "Questions fréquentes", note: "Fabrication sur demande, tailles, livraison, retours et sur-mesure.", extra: "aide question reponse delai fabrication" },
  { href: "/livraison-retours", title: "Livraison & retours", note: "Délais, frais, emballage, retours et échanges.", extra: "expedition colis retour echange remboursement delai" },
  { href: "/suivi", title: "Suivre ma commande", note: "Les étapes de votre commande, de la confection à la livraison.", extra: "suivi commande etape confection expedition livraison" },
  { href: "/compte", title: "Mon compte", note: "Commandes, adresses, tailles et liste d’envies.", extra: "connexion commande suivi profil" },
  { href: "/liste-envies", title: "Liste d’envies", note: "Les pièces que vous avez gardées.", extra: "favoris envies garder" },
  { href: "/retractation", title: "Rétractation en ligne", note: "Exercer votre droit de rétractation de quatorze jours.", extra: "retractation annulation retour" },
  { href: "/cgv", title: "Conditions générales de vente", note: "Commande, prix, paiement, livraison, garanties.", extra: "cgv conditions vente garantie" },
];

/** Image d'un résultat : la mention « visuel provisoire » suit l'image générée jusque dans la recherche. */
const resultImage = (i: Image) => ({ src: i.src, alt: i.alt, width: i.width, height: i.height, ...(i.provisoire ? { provisoire: true } : {}) });

/**
 * Index dans une langue : le français par défaut (index servi par /api/search, mis en cache) ; la
 * page de recherche demande celui de sa langue. Les liens restent sans préfixe de langue : le lien
 * du site les place dans la langue de la page (components/ui/Link.tsx).
 */
export async function buildSearchIndex(locale: Locale = "fr"): Promise<SearchEntry[]> {
  const [products, collections, articles, boutique, docs] = await Promise.all([
    getPublicProducts(locale),
    getCollections(locale),
    getArticles(),
    getDoc<{ categories: Record<string, string> }>("boutique", locale, { plain: true }).catch(() => null),
    Promise.all(PAGE_DOCS.map((d) => getDoc<{ titre?: string; seo?: { description?: string } }>(d.doc, locale, { plain: true }).catch(() => null))),
  ]);
  const categoryLabel = (value: string) => boutique?.categories[value] ?? value;
  const collectionTitle = new Map(collections.map((c) => [c.handle, c.title]));
  const entries: SearchEntry[] = [];

  for (const p of products) {
    entries.push({
      kind: "piece",
      href: `/boutique/${p.handle}`,
      title: p.title,
      note: p.tagline,
      image: p.images[0] ? resultImage(p.images[0]) : undefined,
      price: p.price,
      key: normalize(p.title),
      terms: normalize(
        [
          p.tagline,
          categoryLabel(p.category),
          collectionTitle.get(p.collection) ?? "",
          p.materials.map((m) => m.name).join(" "),
          p.tags.join(" "),
          // pièces créées sur demande : on les trouve aussi par « sur demande », « délai »…
          "créée sur demande artisans français délai de fabrication",
          leadTimeText(p.leadTime),
          p.details.join(" "),
          p.description.slice(0, 2).join(" "),
        ].join(" "),
      ),
    });
  }

  for (const c of collections) {
    entries.push({
      kind: "collection",
      href: `/collections/${c.handle}`,
      title: c.title,
      // saison inconnue (Hypnotic Lace) : l'accroche de la collection sert de légende
      note: c.season || clip(c.lead),
      image: resultImage(c.cover),
      key: normalize(c.title),
      terms: normalize([c.season, c.lead, c.intention.join(" ")].join(" ")),
    });
  }

  for (const a of articles) {
    entries.push({
      kind: "journal",
      href: `/journal/${a.slug}`,
      title: a.title,
      note: a.category,
      key: normalize(a.title),
      terms: normalize([a.category, a.excerpt].join(" ")),
    });
  }

  // titre de la page dans sa langue (document de contenu), à défaut celui de la liste
  const maison: PageEntry[] = PAGE_DOCS.map((d, i) => ({ href: d.href, title: (typeof docs[i]?.titre === "string" && docs[i]?.titre) || d.title, note: docs[i]?.seo?.description ?? "", extra: d.extra }));
  for (const page of [...maison, ...pages]) {
    entries.push({ kind: "maison", href: page.href, title: page.title, note: clip(page.note), key: normalize(page.title), terms: normalize(`${page.note} ${page.extra}`) });
  }

  faq.forEach((group, i) => {
    for (const item of group.items) {
      entries.push({ kind: "maison", href: `/faq#theme-${i}`, title: item.q, note: clip(item.a), key: normalize(item.q), terms: normalize(`${group.title} ${item.a}`) });
    }
  });

  return entries;
}
