import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { subscribeNewsletter } from "@/lib/shopify/admin";
import { after } from "next/server";
import { upsertContact } from "@/lib/marketing/provider";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import {
  EMAIL_MAX,
  NOM_MAX,
  TELEPHONE_MAX,
  nomValide,
  telephoneE164,
  telephoneValide,
  type ChampLettre,
} from "./regles";

/**
 * Inscription à la lettre de la Maison (maquette NEWSLETTER) : Nom, Prénom et E-mail obligatoires,
 * Téléphone facultatif et vérifié, consentement explicite. La version compacte du pied de page
 * (formule « compacte ») ne demande que l'e-mail et le consentement. Contrôle d'origine
 * (proxy.ts), limitation de débit, Turnstile, validation Zod ; consentement confirmé côté Shopify.
 * Réponses : { ok: true } ou { error: code, champs? } ; les messages lisibles vivent dans
 * content/site/fr/site.json (lettre.erreurs), affichés par le formulaire.
 */
const Nom = z.string().trim().min(1).max(NOM_MAX).refine(nomValide);

const Body = z
  .object({
    formule: z.enum(["complete", "compacte"]).default("complete"),
    nom: Nom.optional(),
    prenom: Nom.optional(),
    email: z.email().max(EMAIL_MAX),
    telephone: z
      .string()
      .trim()
      .max(TELEPHONE_MAX)
      .refine(telephoneValide)
      .optional()
      .transform((v) => v || undefined),
    consent: z.literal(true),
    source: z
      .string()
      .max(40)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    turnstile: z.string().max(2048).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.formule !== "complete") return;
    if (!d.nom)
      ctx.addIssue({
        code: "custom",
        path: ["nom"],
        message: "Nom obligatoire",
      });
    if (!d.prenom)
      ctx.addIssue({
        code: "custom",
        path: ["prenom"],
        message: "Prénom obligatoire",
      });
  });

/** Champ du formulaire concerné par une erreur de validation (le consentement s'appelle « consent » dans la requête). */
const champ = (key: PropertyKey | undefined): ChampLettre | null =>
  key === "consent"
    ? "consentement"
    : key === "nom" ||
        key === "prenom" ||
        key === "email" ||
        key === "telephone"
      ? key
      : null;

interface Abonnee {
  email: string;
  date: string;
  source?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, "newsletter", {
    limit: 8,
    windowSeconds: 600,
  });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const champs = [
      ...new Set(
        parsed.error.issues
          .map((i) => champ(i.path[0]))
          .filter((c): c is ChampLettre => c !== null),
      ),
    ];
    return NextResponse.json({ error: "invalide", champs }, { status: 400 });
  }
  const { email, nom, prenom, telephone, source, turnstile } = parsed.data;
  if (!(await verifyTurnstile(turnstile, req)))
    return NextResponse.json({ error: "verification" }, { status: 400 });

  const list = (await kv.get<Abonnee[]>("newsletter:subscribers")) ?? [];
  const coordonnees = {
    ...(nom ? { nom } : {}),
    ...(prenom ? { prenom } : {}),
    ...(telephone ? { telephone } : {}),
  };
  const at = list.findIndex(
    (s) => s.email.toLowerCase() === email.toLowerCase(),
  );
  // une nouvelle inscription complète les coordonnées, sans changer la date du premier consentement
  if (at === -1)
    list.push({
      email,
      date: new Date().toISOString(),
      source,
      ...coordonnees,
    });
  else list[at] = { ...list[at], ...coordonnees };
  await kv.set("newsletter:subscribers", list);

  const phone = telephoneE164(telephone);
  await subscribeNewsletter(email, { firstName: prenom, lastName: nom, phone }).catch((e) =>
    console.error("[newsletter] Shopify", e),
  );
  after(async () => {
    await upsertContact({
      email,
      firstName: prenom,
      lastName: nom,
      phone,
      marketing: true,
    }).catch((e) => console.error("[newsletter] e-mails", e));
    await onNewsletterSignup(email).catch((e) =>
      console.error("[newsletter] bienvenue", e),
    );
  });
  return NextResponse.json({ ok: true });
}
