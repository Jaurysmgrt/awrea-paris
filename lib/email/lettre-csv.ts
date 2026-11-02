/** Inscrites à la lettre et leur tableur (fonction pure, testée dans tests/unit/lettre.test.ts). */
export interface Inscrite {
  email: string;
  date: string | null;
  /** « lettre » (formulaire du site), « commande », « compte »… */
  source: string;
  prenom?: string;
  nom?: string;
}

/** Tableur des inscrites (séparateur « ; », lu tel quel par Excel en français). */
export function inscritesCsv(liste: Inscrite[]): string {
  // une cellule qui commence par = + - @ serait lue comme une formule : elle est neutralisée
  const cell = (v: string | null | undefined) => {
    const s = (v ?? "").replace(/"/g, '""');
    return `"${/^[=+\-@\t\r]/.test(s) ? `'${s}` : s}"`;
  };
  const lignes = liste.map((i) => [i.email, i.prenom, i.nom, i.date?.slice(0, 10), i.source].map(cell).join(";"));
  return ["﻿" + ["E-mail", "Prénom", "Nom", "Inscrite le", "Origine"].map(cell).join(";"), ...lignes].join("\r\n");
}
