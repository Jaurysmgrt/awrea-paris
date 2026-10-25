/** Transporteurs proposés à l'expédition d'une commande (Atelier et route de l'Atelier). */
export const CARRIERS = ["Colissimo", "Chronopost", "Mondial Relay", "DHL"] as const;
export type Carrier = (typeof CARRIERS)[number];
