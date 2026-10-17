/**
 * Petites données conservées chiffrées (AES-256-GCM), relisibles par le serveur seul : la clé
 * dérive du secret de session, distincte pour chaque usage. Même règle que les sessions : sur
 * Vercel, jamais de clé par défaut (lib/auth/session.ts).
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionSecret } from "@/lib/auth/session";

const key = (purpose: string) => createHash("sha256").update(`seal:${purpose}:${sessionSecret()}`).digest();

export function seal(purpose: string, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(purpose), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

/** null si la donnée a été altérée ou scellée avec un autre secret (rotation de SESSION_SECRET). */
export function unseal(purpose: string, data: string): string | null {
  try {
    const [iv, tag, enc] = data.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(purpose), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
