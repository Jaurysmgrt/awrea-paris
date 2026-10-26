/**
 * Mémoire de navigation (consentement « personnalisation » uniquement) :
 * pièces et collections consultées, sur l'appareil (stockage local, 30 dernières)
 * et, pour une cliente connectée, dans son compte (13 mois au plus).
 */
export interface SeenItem {
  kind: "view" | "collection";
  handle?: string;
  collection?: string;
  at: number;
}

const KEY = "awrea_seen";
const CAP = 30;

export function readSeen(): SeenItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SeenItem[];
  } catch {
    return [];
  }
}

export function rememberSeen(item: Omit<SeenItem, "at">) {
  try {
    const list = readSeen().filter((s) => !(s.kind === item.kind && s.handle === item.handle && s.collection === item.collection));
    localStorage.setItem(KEY, JSON.stringify([{ ...item, at: Date.now() }, ...list].slice(0, CAP)));
  } catch {
    /* stockage indisponible */
  }
  if (/(?:^|; )awrea_signed_in=1/.test(document.cookie)) {
    fetch("/api/account/browsing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: item.kind, handle: item.handle, collection: item.collection }),
      keepalive: true,
    }).catch(() => {});
  }
}
