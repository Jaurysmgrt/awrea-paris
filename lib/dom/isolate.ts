/**
 * Rend tout le reste de la page inerte (ni clic, ni tabulation, ni lecteur d'écran) pendant
 * qu'une couche plein écran est ouverte : on remonte de l'élément jusqu'à <body> en neutralisant
 * les frères de chaque ancêtre. Renvoie la fonction qui rétablit exactement l'état précédent.
 */
export function isolate(el: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert || sibling.tagName === "SCRIPT") continue;
      sibling.inert = true;
      changed.push(sibling);
    }
    node = parent;
  }
  return () => {
    for (const s of changed) s.inert = false;
  };
}
