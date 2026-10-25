/**
 * Fiche d'une pièce d'une collection pas encore dévoilée : tant que la visiteuse n'a pas d'accès
 * (lien personnel de l'avant-première, ou mot de passe d'une présentation privée), l'ajout au
 * panier laisse place aux dates écrites en toutes lettres et au chemin vers la page « Bientôt ».
 * Simple confort d'affichage : le panier et la commande revérifient l'accès côté serveur.
 *
 * Partie serveur : les textes (avant-premieres.json, partie « porte ») sont composés ici avec les
 * dates de la collection ; la partie cliente (DropGateClient) choisit selon l'heure et l'accès.
 */
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { dropVars } from "@/lib/drops";
import type { AvantPremieresTexts } from "./regles";
import { DropGateClient, type DropInfo } from "./DropGateClient";

export type { DropInfo };

export async function DropGate({ drop, children }: { drop: DropInfo | null; children: React.ReactNode }) {
  if (!drop) return <>{children}</>;
  const t = await getDoc<AvantPremieresTexts>("avant-premieres");
  const vars = dropVars(t, drop);
  return (
    <DropGateClient
      drop={drop}
      t={{
        etat: { annonce: t.etat.annonce, avantPremiere: t.etat.avantPremiere, privee: t.etat.privee },
        message: { annonce: fill(t.porte.annonce, vars), avantPremiere: fill(t.porte.avantPremiere, vars), privee: fill(t.porte.privee, vars) },
        lien: { avantPremiere: t.porte.lienAvantPremiere, privee: t.porte.lienPrivee },
      }}
    >
      {children}
    </DropGateClient>
  );
}
