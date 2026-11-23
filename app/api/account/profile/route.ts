import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/require-customer";
import { acceptTerms, clearBrowsing, updateProfile } from "@/lib/customers";
import { upsertContact } from "@/lib/marketing/provider";
import { legalVersions } from "@/content/legal-versions";
import { accountCopy } from "@/content/fr/account";
import { abonnerDepuisCompte } from "@/lib/crm";
import { unsubscribe } from "@/lib/marketing/unsubscribe";

const size = z.enum(["XS", "S", "M", "L", "XL", "TU"]);
const cm = z.number().int().min(40).max(220);
const Patch = z
  .object({
    firstName: z.string().trim().max(80).nullable(),
    lastName: z.string().trim().max(80).nullable(),
    phone: z.string().trim().max(30).nullable(),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    locale: z.enum(["fr", "en"]),
    currency: z.enum(["EUR", "GBP", "USD", "CHF"]),
    sizes: z.object({ haut: size.optional(), bas: size.optional(), robe: size.optional(), mesures: z.object({ poitrine: cm.optional(), taille: cm.optional(), hanches: cm.optional(), stature: cm.optional() }).optional() }),
    marketingEmail: z.boolean(),
    personalization: z.boolean(),
    cercleMember: z.boolean(),
    acceptTerms: z.literal(true),
  })
  .partial();

/** Mise à jour du profil : coordonnées, tailles, préférences, consentements, Cercle, CGU. */
export async function PATCH(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Certaines informations ne sont pas valides." }, { status: 400 });
  const { acceptTerms: terms, ...patch } = parsed.data;
  if (terms) await acceptTerms(session, legalVersions.cgu);
  const profile = await updateProfile(session, patch);
  // retrait de la personnalisation : les données de navigation sont effacées aussitôt
  if (patch.personalization === false) await clearBrowsing(session);
  after(async () => {
    // CRM : la case « lettres » de son compte abonne (adresse vérifiée par la connexion) ou désinscrit,
    // et la désinscription vaut partout
    if (patch.marketingEmail === true) await abonnerDepuisCompte(profile.email, `${accountCopy.profile.marketing} : ${accountCopy.profile.marketingHint}`).catch((e) => console.error("[profil] lettre", e));
    if (patch.marketingEmail === false) await unsubscribe(profile.email, { source: "compte" }).catch((e) => console.error("[profil] lettre", e));
    if (patch.marketingEmail !== undefined || patch.firstName !== undefined || patch.cercleMember !== undefined || patch.birthday !== undefined) {
      await upsertContact({ email: profile.email, firstName: profile.firstName, lastName: profile.lastName, locale: profile.locale, marketing: profile.marketingEmail, cercle: profile.cercleMember, birthday: profile.birthday }).catch((e) =>
        console.error("[profil] e-mails", e),
      );
    }
  });
  return NextResponse.json({ ok: true, profile });
}
