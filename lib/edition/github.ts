/**
 * Recopie facultative des publications dans le dépôt Git (API GitHub, « contents »), pour que Git
 * reste l'archive des contenus même quand ils sont modifiés en ligne.
 * Variables : EDITION_GITHUB_TOKEN (jeton à accès fin, droit « Contents : lecture et écriture » sur
 * ce seul dépôt), EDITION_GITHUB_REPO (« propriétaire/depot »), EDITION_GITHUB_BRANCH (main).
 * Chaque recopie déclenche aussi un nouveau déploiement, qui reprend ces fichiers comme base.
 */
import "server-only";
import { githubSync, type Locale } from "./config";

export async function syncToGit(doc: string, locale: Locale, content: unknown, message: string): Promise<boolean> {
  const cfg = githubSync();
  if (!cfg) return false;
  const file = `content/site/${locale}/${doc}.json`;
  const api = `https://api.github.com/repos/${cfg.repo}/contents/${file}`;
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const current = await fetch(`${api}?ref=${encodeURIComponent(cfg.branch)}`, { headers, cache: "no-store" });
  const sha = current.ok ? ((await current.json()) as { sha?: string }).sha : undefined;
  const res = await fetch(api, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message, branch: cfg.branch, sha, content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`).toString("base64") }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return true;
}

/** Retire du dépôt le fichier d'une page supprimée dans l'éditeur. */
export async function removeFromGit(doc: string, locale: Locale, message: string): Promise<boolean> {
  const cfg = githubSync();
  if (!cfg) return false;
  const api = `https://api.github.com/repos/${cfg.repo}/contents/content/site/${locale}/${doc}.json`;
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const current = await fetch(`${api}?ref=${encodeURIComponent(cfg.branch)}`, { headers, cache: "no-store" });
  if (!current.ok) return false;
  const { sha } = (await current.json()) as { sha?: string };
  const res = await fetch(api, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message, branch: cfg.branch, sha }), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return true;
}
