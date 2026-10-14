import s from "../da-dentelle.module.css";

/** Le réseau rendu visible : un fil sur toute la largeur, un picot au centre de chacune des douze colonnes. */
export function Reseau({ className }: { className?: string }) {
  return (
    <div className={`${s.reseau} ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, n) => (
        <span key={n} style={{ "--n": n } as React.CSSProperties} />
      ))}
    </div>
  );
}

/** Fil séparateur : un picot à chaque bout. */
export function Fil({ className }: { className?: string }) {
  return <div className={`${s.fil} ${className ?? ""}`} aria-hidden="true" />;
}
