/**
 * Connexion des clientes : par e-mail (code à usage unique, sans mot de passe), Google ou Apple.
 *  - Production : Supabase Auth (codes envoyés par Supabase, fournisseurs OAuth configurés
 *    dans le tableau de bord Supabase, voir docs/supabase.md).
 *  - Démonstration : code à six chiffres envoyé par l'outil d'e-mails du site (ou affiché à
 *    l'écran hors production), session signée en cookie.
 */
import "server-only";
import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/db/supabase";
import { supabaseServer } from "@/lib/db/server";
import { demoCustomerId, type CustomerSession } from "@/lib/customers";
import { kv } from "@/lib/store";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/seo/metadata";
import { sign, verify } from "./session";

export const DEMO_SESSION_COOKIE = "awrea_session";
/** indice non sensible (aucune donnée personnelle) qui dit au navigateur qu'une session existe */
export const SIGNED_IN_HINT = "awrea_signed_in";
const SESSION_DAYS = 30;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export const authMode = isSupabaseConfigured ? "supabase" : "demo";
/** le code de démonstration ne s'affiche jamais à l'écran sur le site de production */
const showDemoCode = () => process.env.VERCEL_ENV !== "production" || process.env.AWREA_DEMO_CODES === "1";

export async function getCustomerSession(): Promise<CustomerSession | null> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.auth.getUser();
    return data.user?.email ? { id: data.user.id, email: data.user.email } : null;
  }
  const s = verify<{ email: string }>((await cookies()).get(DEMO_SESSION_COOKIE)?.value);
  return s ? { id: demoCustomerId(s.email), email: s.email } : null;
}

async function setHint(on: boolean) {
  const jar = await cookies();
  if (on) jar.set(SIGNED_IN_HINT, "1", { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 24 * 3600 });
  else jar.delete(SIGNED_IN_HINT);
}

export type StartResult = { ok: true; demoCode?: string } | { ok: false; error: string; status: number };

/**
 * Envoie un code de connexion. `create` : création de compte autorisée (les CGU ont été acceptées).
 */
export async function startEmailLogin(email: string, opts: { create: boolean; termsVersion?: string; marketingEmail?: boolean }): Promise<StartResult> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { error } = await db.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: opts.create,
        emailRedirectTo: `${siteUrl}/api/account/callback`,
        data: opts.create ? { terms_version: opts.termsVersion, marketing_email: Boolean(opts.marketingEmail) } : undefined,
      },
    });
    if (error) {
      if (/signups not allowed|user not found/i.test(error.message)) return { ok: false, status: 404, error: "Aucun compte n’existe avec cette adresse. Vous pouvez en créer un." };
      return { ok: false, status: 400, error: "L’envoi du code a échoué. Merci de réessayer dans un instant." };
    }
    return { ok: true };
  }
  const id = demoCustomerId(email);
  const exists = Boolean(await kv.get(`cust:${id}`));
  if (!exists && !opts.create) return { ok: false, status: 404, error: "Aucun compte n’existe avec cette adresse. Vous pouvez en créer un." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await kv.set(`otp:${email.toLowerCase()}`, { code, exp: Date.now() + CODE_TTL_MS, attempts: 0, create: opts.create, termsVersion: opts.termsVersion, marketingEmail: opts.marketingEmail });
  const mail = brandEmail({
    preheader: `Votre code de connexion : ${code}`,
    title: "Votre code de connexion",
    paragraphs: [`Voici votre code pour accéder à votre compte Awrea Paris : ${code}.`, "Il est valable dix minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message."],
  });
  await sendEmail({ to: email, subject: "Votre code de connexion — Awrea Paris", ...mail, tag: "login-code" }).catch((e) => console.error("[auth] e-mail", e));
  return { ok: true, demoCode: showDemoCode() ? code : undefined };
}

export type VerifyResult = { ok: true; session: CustomerSession; created: boolean; termsVersion?: string; marketingEmail?: boolean } | { ok: false; error: string; status: number };

export async function verifyEmailLogin(email: string, code: string): Promise<VerifyResult> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data, error } = await db.auth.verifyOtp({ email, token: code, type: "email" });
    if (error || !data.user?.email) return { ok: false, status: 400, error: "Ce code n’est pas valide ou a expiré." };
    await setHint(true);
    return { ok: true, session: { id: data.user.id, email: data.user.email }, created: false };
  }
  const key = `otp:${email.toLowerCase()}`;
  const pending = await kv.get<{ code: string; exp: number; attempts: number; create: boolean; termsVersion?: string; marketingEmail?: boolean }>(key);
  if (!pending || pending.exp < Date.now()) return { ok: false, status: 400, error: "Ce code a expiré. Demandez-en un nouveau." };
  if (pending.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, status: 429, error: "Trop d’essais. Demandez un nouveau code." };
  if (pending.code !== code.trim()) {
    await kv.set(key, { ...pending, attempts: pending.attempts + 1 });
    return { ok: false, status: 400, error: "Ce code n’est pas valide." };
  }
  await kv.del(key);
  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, sign({ email }, SESSION_DAYS * 24 * 3600), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  await setHint(true);
  return { ok: true, session: { id: demoCustomerId(email), email }, created: pending.create, termsVersion: pending.termsVersion, marketingEmail: pending.marketingEmail };
}

/** URL de connexion Google ou Apple (null en démonstration). */
export async function oauthUrl(provider: "google" | "apple", next: string, termsVersion?: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const db = await supabaseServer();
  const params = new URLSearchParams({ next });
  if (termsVersion) params.set("cgu", termsVersion);
  const { data, error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${siteUrl}/api/account/callback?${params}`, scopes: provider === "apple" ? "name email" : undefined },
  });
  if (error) throw new Error(error.message);
  return data.url;
}

/** Retour de Google, Apple ou d'un lien magique : échange du code contre une session. */
export async function exchangeAuthCode(code: string): Promise<CustomerSession | null> {
  if (!isSupabaseConfigured) return null;
  const db = await supabaseServer();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return null;
  await setHint(true);
  return { id: data.user.id, email: data.user.email };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    await db.auth.signOut();
  } else {
    (await cookies()).delete(DEMO_SESSION_COOKIE);
  }
  await setHint(false);
}
