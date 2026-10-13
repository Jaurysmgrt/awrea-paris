/**
 * Préférences d'affichage de la visiteuse, gardées dans le navigateur (stockage local
 * « awrea_prefs », strictement nécessaire : aucune donnée personnelle, aucun suivi).
 *  - mode : « auto » suit le réglage du téléphone ; « light » (Jour) et « dark » (Nuit) l'imposent ;
 *  - motion : « reduce » apaise toutes les animations, même si le système ne le demande pas ;
 *  - sound : l'ambiance sonore, toujours coupée par défaut.
 *
 * Le script de <head> applique ces choix avant le premier affichage (aucun flash) et suit
 * en direct le réglage du téléphone et les autres onglets.
 */
export const PREFS_KEY = "awrea_prefs";
export const PREFS_EVENT = "awrea:prefs";

export type ColorMode = "auto" | "light" | "dark";
export type MotionPref = "auto" | "reduce";
export interface Prefs {
  mode: ColorMode;
  motion: MotionPref;
  sound: boolean;
}

export const defaultPrefs: Prefs = { mode: "auto", motion: "auto", sound: false };

function sanitize(raw: unknown): Prefs {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Prefs, unknown>>;
  return {
    mode: p.mode === "light" || p.mode === "dark" ? p.mode : "auto",
    motion: p.motion === "reduce" ? "reduce" : "auto",
    sound: p.sound === true,
  };
}

/** copie en mémoire, si le stockage local est refusé (navigation privée stricte) */
let memory = "";

/** Valeur brute et stable des préférences (pour useSyncExternalStore). */
export function prefsSnapshot(): string {
  try {
    return localStorage.getItem(PREFS_KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function parsePrefs(raw: string): Prefs {
  try {
    return sanitize(JSON.parse(raw || "{}"));
  } catch {
    return defaultPrefs;
  }
}

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  return parsePrefs(prefsSnapshot());
}

/** Abonnement aux changements (ce site, les autres onglets). */
export function subscribePrefs(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => e.key === PREFS_KEY && onChange();
  window.addEventListener(PREFS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PREFS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Enregistre un choix, l'applique aussitôt (en fondu si le navigateur le permet) et prévient la page. */
export function writePrefs(patch: Partial<Prefs>): Prefs {
  const next = sanitize({ ...readPrefs(), ...patch });
  memory = JSON.stringify(next);
  try {
    localStorage.setItem(PREFS_KEY, memory);
  } catch {
    // navigation privée stricte : le choix vaut pour la page en cours
  }
  const root = document.documentElement;
  const apply = () => {
    root.dataset.mode = resolvedMode(next.mode);
    if (next.motion === "reduce") root.dataset.motion = "reduce";
    else delete root.dataset.motion;
  };
  const modeChanges = resolvedMode(next.mode) !== root.dataset.mode;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (modeChanges && doc.startViewTransition && !prefersReducedMotionNow()) {
    // le passage Jour ↔ Nuit se fait en un seul fondu lent, sans que chaque bloc ne glisse à son rythme
    root.classList.add("scene-instant", "mode-switch");
    const done = () => root.classList.remove("scene-instant", "mode-switch");
    doc.startViewTransition(apply).finished.then(done, done);
  } else apply();
  window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: next }));
  return next;
}

export function resolvedMode(mode: ColorMode): "light" | "dark" {
  if (mode !== "auto") return mode;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function prefersReducedMotionNow(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
}

/**
 * Script inline de <head> : lit les préférences, pose data-mode (« light » | « dark ») et
 * data-motion sur <html>, puis suit le réglage du téléphone et les autres onglets.
 */
export function prefsHeadScript(): string {
  return [
    "try{",
    "var d=document.documentElement,q=matchMedia('(prefers-color-scheme: dark)'),",
    "f=function(){var p={};",
    `try{p=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}')||{}}catch(e){}`,
    "d.dataset.mode=p.mode==='dark'||p.mode==='light'?p.mode:(q.matches?'dark':'light');",
    "if(p.motion==='reduce')d.dataset.motion='reduce';else delete d.dataset.motion};",
    "f();",
    "q.addEventListener&&q.addEventListener('change',f);",
    `addEventListener('storage',function(e){if(e.key==='${PREFS_KEY}')f()})`,
    "}catch(e){}",
  ].join("");
}
