"use client";
/**
 * Écran d'ouverture (MARQUE.md § 3 : première visite, moins de 2 s) : sur un voile blanc cassé,
 * le médaillon AW se dessine d'un fil noir très fin, puis le voile s'ajoure et disparaît —
 * la même ouverture en jours de tulle que les images. Jamais bloquant (aucun pointeur capté),
 * masqué aux lecteurs d'écran, absent en animations apaisées (CSS).
 *
 * Rendu par le serveur seulement si le témoin de session `awrea_ouverture` est absent : aucun
 * éclair pour une visiteuse qui l'a déjà vu. Témoin de session sans donnée personnelle ; en
 * production, à valider avec le registre des témoins (lib/consent).
 */
import { useEffect } from "react";
import { Medaillon } from "./Medaillon";
import { TEMOIN_OUVERTURE } from "./temoin";
import s from "../da-dentelle.module.css";

export function Voile() {
  useEffect(() => {
    document.cookie = `${TEMOIN_OUVERTURE}=vu; Path=/; SameSite=Lax`;
  }, []);
  return (
    <div className={s.voile} aria-hidden="true">
      <Medaillon className={s.voileMedaillon} trace />
    </div>
  );
}
