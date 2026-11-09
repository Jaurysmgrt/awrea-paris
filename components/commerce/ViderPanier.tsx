"use client";
import { useEffect, useRef } from "react";
import { useCart } from "./CartProvider";

/**
 * Retour d'un paiement Stripe réussi : le panier se vide une fois, ici (il restait intact pendant
 * le paiement, pour qu'une cliente qui renonce le retrouve).
 */
export function ViderPanier() {
  const { dispatch } = useCart();
  const fait = useRef(false);
  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    void dispatch({ type: "clear" });
  }, [dispatch]);
  return null;
}
