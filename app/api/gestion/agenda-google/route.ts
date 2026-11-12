import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { kv } from "@/lib/store";
import { seal, unseal } from "@/lib/security/seal";
import { rateLimit } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";
import { DUREE_FLUX, ErreurGoogle, configGoogle, nouveauFlux, urlAutorisation, verifierRetour, type FluxGoogle } from "@/lib/google-agenda/regles";
import { adresseRetour, cheminFlux, connecterGoogle, deconnecterGoogle, synchroniserGoogle, vueGoogle } from "@/lib/google-agenda";

/** cookie de la connexion en cours : chiffré, HttpOnly, dix minutes, réservé à cette route */
const FLUX = "awrea_agenda_google";
const USAGE = "google-agenda-flux";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connecter") }),
  z.object({
    action: z.literal("terminer"),
    code: z.string().min(1).max(2048).regex(/^[\x21-\x7e]+$/),
    state: z.string().min(1).max(2048).regex(/^[\w.-]+$/),
  }),
  z.object({ action: z.literal("deconnecter") }),
  z.object({ action: z.literal("reessayer"), id: z.string().regex(/^RDV-[A-F0-9]{8}$/).optional() }),
]);

const PAS_BRANCHE = "La connexion à Google Agenda n’est pas encore branchée. Le guide d’activation explique comment la brancher.";

/**
 * Google Agenda dans l'Atelier › Rendez-vous (OAuth 2.0, flux « application Web » de Google) :
 *  - connecter : prépare le `state` signé et le défi PKCE, garde le vérificateur dans un cookie
 *    chiffré, et renvoie l'adresse de la page d'autorisation de Google ;
 *  - terminer : au retour de Google (app/gestion/agenda-google), vérifie le `state`, la connexion
 *    commencée dans ce navigateur et le compte connecté, puis échange le code ; le jeton reste ici ;
 *  - deconnecter : retire l'accès chez Google et efface le jeton ;
 *  - reessayer : renvoie à Google ce qui attend.
 * Jamais de jeton dans une réponse ni dans un journal.
 */
export async function POST(req: Request) {
  const who = await currentAdmin();
  if (!who) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const limited = await rateLimit(req, "atelier-agenda-google", { limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const d = parsed.data;
  const config = configGoogle();
  if (!config && d.action !== "deconnecter") return NextResponse.json({ error: PAS_BRANCHE }, { status: 409 });
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";

  if (d.action === "connecter") {
    const { flux, state, challenge } = nouveauFlux(who);
    jar.set(FLUX, seal(USAGE, JSON.stringify(flux)), { httpOnly: true, sameSite: "strict", secure, path: cheminFlux(), maxAge: DUREE_FLUX });
    return NextResponse.json({ ok: true, url: urlAutorisation(config!, { redirectUri: adresseRetour(), state, challenge }) }, { headers: { "Cache-Control": "no-store" } });
  }

  if (d.action === "terminer") {
    const brut = jar.get(FLUX)?.value;
    // le cookie ne sert qu'une fois
    jar.set(FLUX, "", { path: cheminFlux(), maxAge: 0 });
    let flux: FluxGoogle | null = null;
    try {
      flux = brut ? (JSON.parse(unseal(USAGE, brut) ?? "null") as FluxGoogle | null) : null;
    } catch {
      flux = null;
    }
    const retour = verifierRetour({ state: d.state, flux, admin: who });
    if (!retour.ok) return NextResponse.json({ error: retour.raison }, { status: 400 });
    // un retour ne sert qu'une fois, même rejoué dans ce navigateur
    if ((await kv.incr(`agenda-google:retour:${flux!.n}`, 2 * DUREE_FLUX)) > 1) return NextResponse.json({ error: "Ce retour de Google a déjà servi. Recommencez la connexion si besoin." }, { status: 400 });
    try {
      const c = await connecterGoogle({ code: d.code, verifier: retour.verifier, par: who });
      // les rendez-vous à venir partent aussitôt vers l'agenda, sans faire attendre l'écran
      after(() => synchroniserGoogle().then(() => undefined));
      await logAction({ agent: "rendez-vous", kind: "google-agenda", status: "done", summary: `Google Agenda connecté par ${who}${c.calendrier ? ` (${c.calendrier})` : ""}` }).catch(() => {});
      return NextResponse.json({ ok: true, message: "Google Agenda est connecté. Vos rendez-vous à venir y sont ajoutés." });
    } catch (e) {
      return NextResponse.json({ error: e instanceof ErreurGoogle ? e.message : "Google n’a pas répondu comme prévu. Recommencez dans un instant." }, { status: 502 });
    }
  }

  if (d.action === "deconnecter") {
    const { revoque } = await deconnecterGoogle();
    await logAction({ agent: "rendez-vous", kind: "google-agenda", status: "info", summary: `Google Agenda déconnecté par ${who}${revoque ? "" : ", accès à retirer aussi dans le compte Google"}` }).catch(() => {});
    return NextResponse.json({
      ok: true,
      message: revoque
        ? "Google Agenda est déconnecté, et l’accès est retiré chez Google. Les rendez-vous déjà ajoutés restent dans votre agenda."
        : "Google Agenda est déconnecté du site. Google n’a pas confirmé le retrait : retirez aussi l’accès dans votre compte Google, rubrique Sécurité.",
    });
  }

  const vue = await vueGoogle();
  if (vue.etat !== "connecte") return NextResponse.json({ error: vue.etat === "a-reconnecter" ? "Reconnectez d’abord Google Agenda." : "Connectez d’abord Google Agenda." }, { status: 409 });
  const bilan = await synchroniserGoogle(d.id);
  if (bilan.aReconnecter) return NextResponse.json({ error: "Google Agenda a retiré l’accès de ce site, ou il a expiré. Reconnectez Google Agenda." }, { status: 409 });
  if (bilan.echecs) return NextResponse.json({ error: bilan.erreur ?? "Google Agenda n’a pas répondu comme prévu." }, { status: 502 });
  return NextResponse.json({ ok: true, message: bilan.faits ? "C’est fait : votre agenda Google est à jour." : "Rien à envoyer : votre agenda Google est déjà à jour." });
}
