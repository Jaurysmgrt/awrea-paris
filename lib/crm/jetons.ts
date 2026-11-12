/**
 * Jetons des liens envoyés par e-mail (confirmation de l'inscription à la lettre, privilège sur un
 * autre appareil, désinscription) : chiffrés et authentifiés (AES-256-GCM, clé dérivée du secret de
 * session SESSION_SECRET), donc opaques. L'adresse e-mail n'apparaît jamais en clair dans l'adresse
 * de la page : un outil de mesure qui lit l'adresse de la page n'apprend rien sur la personne.
 *
 * Module sans dépendance au serveur Next (testé dans tests/unit/lettre-jetons.test.ts).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionSecret, sessionsConfigured } from "@/lib/auth/session";
import { normaliserEmail } from "@/lib/crm/regles";

export type TypeJeton = "lettre-confirmation" | "privilege-appareil" | "desinscription";

const cle = (secret: string) => createHash("sha256").update(`jeton-lien:${secret}`).digest();

/** Jeton d'un lien : type, adresse normalisée et échéance, chiffrés ensemble. */
export function fabriquerJeton(k: TypeJeton, email: string, secondes: number, o: { secret?: string; maintenant?: number } = {}): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(o.secret ?? sessionSecret()), iv);
  const corps = JSON.stringify({ k, e: normaliserEmail(email), x: Math.floor((o.maintenant ?? Date.now()) / 1000) + secondes });
  const chiffre = Buffer.concat([c.update(corps, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), chiffre].map((b) => b.toString("base64url")).join(".");
}

/**
 * Adresse et type d'un jeton valable (bon secret, intact, pas expiré, d'un des types attendus),
 * sinon null.
 */
export function lireJeton(jeton: string | null | undefined, types: readonly TypeJeton[], o: { secret?: string; maintenant?: number } = {}): { k: TypeJeton; e: string } | null {
  if (!jeton || jeton.length > 1024 || (!o.secret && !sessionsConfigured())) return null;
  const parts = jeton.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^[\w-]+$/.test(p))) return null;
  try {
    const [iv, tag, chiffre] = parts.map((p) => Buffer.from(p, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const d = createDecipheriv("aes-256-gcm", cle(o.secret ?? sessionSecret()), iv);
    d.setAuthTag(tag);
    const v = JSON.parse(Buffer.concat([d.update(chiffre), d.final()]).toString("utf8")) as { k?: unknown; e?: unknown; x?: unknown };
    if (typeof v.k !== "string" || !types.includes(v.k as TypeJeton) || typeof v.e !== "string" || typeof v.x !== "number") return null;
    if (v.x < (o.maintenant ?? Date.now()) / 1000) return null;
    return { k: v.k as TypeJeton, e: v.e };
  } catch {
    return null;
  }
}
