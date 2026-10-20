/**
 * Index de recherche : pièces, collections, Journal, pages de la maison et réponses de la FAQ.
 * Construit côté serveur (catalogue Shopify ou démonstration), servi en un seul fichier léger
 * à la recherche plein écran, qui filtre ensuite instantanément dans le navigateur.
 */
import "server-only";
import { getPublicProducts, getCollections } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";
import { leadTimeText } from "@/lib/commerce/availability";
import { atelier, boutique, contact, maison, outfits, pressePage } from "@/content/fr/pages";
import { faq } from "@/content/fr/faq";
import { getDoc } from "@/lib/edition/read";
import { normalize, type SearchEntry } from "./match";
import type { Image } from "@/lib/commerce/types";

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, s.lastIndexOf(" ", n)).replace(/[,;:.]$/, "")}…` : s);

type PageEntry = { href: string; title: string; note: string; extra: string };

const pages: PageEntry[] = [
  { href: "/la-maison", title: "La Maison", note: maison.seo.description, extra: "creatrice manifeste consommer plus juste histoire paris" },
  { href: "/atelier", title: "L’Atelier", note: atelier.seo.description, extra: "savoir faire croquis dorure coupe couture artisans francais fabrication sur demande coulisses essayage" },
  { href: "/outfits", title: "Outfits", note: outfits.seo.description, extra: "look tenue complete silhouette outfit" },
  { href: "/contact", title: "Contact", note: contact.seo.description, extra: "contact ecrire message question conseil" },
  { href: "/faq", title: "Questions fréquentes", note: "Fabrication sur demande, tailles, livraison, retours et sur-mesure.", extra: "aide question reponse delai fabrication" },
  { href: "/livraison-retours", title: "Livraison & retours", note: "Délais, frais, emballage, retours et échanges.", extra: "expedition colis retour echange remboursement delai" },
  { href: "/presse", title: "Presse", note: pressePage.seo.description, extra: "dossier de presse journaliste contact presse" },
  { href: "/compte", title: "Mon compte", note: "Commandes, adresses, tailles et liste d’envies.", extra: "connexion commande suivi profil" },
  { href: "/liste-envies", title: "Liste d’envies", note: "Les pièces que vous avez gardées.", extra: "favoris envies garder" },
  { href: "/retractation", title: "Rétractation en ligne", note: "Exercer votre droit de rétractation de quatorze jours.", extra: "retractation annulation retour" },
  { href: "/cgv", title: "Conditions générales de vente", note: "Commande, prix, paiement, livraison, garanties.", extra: "cgv conditions vente garantie" },
];

const categoryLabel = (value: string) => boutique.categories.find((c) => c.value === value)?.label ?? value;

/** Image d'un résultat : la mention « visuel provisoire » suit l'image générée jusque dans la recherche. */
const resultImage = (i: Image) => ({ src: i.src, alt: i.alt, width: i.width, height: i.height, ...(i.provisoire ? { provisoire: true } : {}) });

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const [products, collections, articles, rendezVous] = await Promise.all([
    getPublicProducts(),
    getCollections(),
    getArticles(),
    getDoc<{ seo: { description: string } }>("rendez-vous", undefined, { plain: true }).catch(() => null),
  ]);
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

  // prise de rendez-vous : sa propre page (/rendez-vous), légende reprise de son document de contenu
  const rdv: PageEntry = { href: "/rendez-vous", title: "Prendre rendez-vous", note: rendezVous?.seo.description ?? "", extra: "rendez vous essayage atelier sur mesure visio appel video prive conseil" };
  for (const page of [...pages, rdv]) {
    entries.push({ kind: "maison", href: page.href, title: page.title, note: clip(page.note), key: normalize(page.title), terms: normalize(`${page.note} ${page.extra}`) });
  }

  faq.forEach((group, i) => {
    for (const item of group.items) {
      entries.push({ kind: "maison", href: `/faq#theme-${i}`, title: item.q, note: clip(item.a), key: normalize(item.q), terms: normalize(`${group.title} ${item.a}`) });
    }
  });

  return entries;
}
