import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { CrmError } from "@/lib/crm";
import { inscrireALaLettre } from "@/lib/crm/lettre";
import {
  EMAIL_MAX,
  NOM_MAX,
  TELEPHONE_MAX,
  nomValide,
  telephoneValide,
  type ChampLettre,
} from "./regles";

/**
 * Inscription à la lettre de la Maison (maquette NEWSLETTER) : Nom, Prénom et E-mail obligatoires,
 * Téléphone facultatif et vérifié, consentement explicite. La version compacte du pied de page
 * (formule « compacte ») ne demande que l'e-mail et le consentement, comme la fenêtre « Profitez de
 * votre privilège » (source « fenetre »). Contrôle d'origine (proxy.ts), limitation de débit,
 * Turnstile, validation Zod ; consentement gardé avec l’inscription, confirmée par un e-mail.
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
    langue: z.enum(["fr", "en"]).optional(),
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
  const { email, nom, prenom, telephone, source, turnstile, langue } =
    parsed.data;
  if (!(await verifyTurnstile(turnstile, req)))
    return NextResponse.json({ error: "verification" }, { status: 400 });

  // double confirmation (lib/crm/lettre.ts) : la fiche note la demande et l'e-mail de confirmation
  // part ; l'inscription, le privilège et la bienvenue n'arrivent qu'au clic sur son lien. La réponse
  // est la même que la personne soit nouvelle ou déjà inscrite.
  try {
    await inscrireALaLettre({
      email,
      prenom,
      nom,
      telephone,
      source: source ?? "site",
      locale: langue ?? "fr",
    });
  } catch (e) {
    if (e instanceof CrmError)
      return NextResponse.json(
        { error: "invalide", champs: ["email"] },
        { status: 400 },
      );
    console.error("[newsletter]", e);
    return NextResponse.json({ error: "generale" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
