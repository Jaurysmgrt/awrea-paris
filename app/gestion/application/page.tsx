import Link from "@/components/ui/Link";
import { ApplicationAtelier } from "@/components/admin/ApplicationAtelier";
import { atelierHref } from "@/lib/admin/path";

/**
 * Atelier › Paramètres › Application : l'Atelier installé sur le téléphone comme une application
 * privée (iPhone et Android), ses notifications et les appareils prévenus. Même connexion, mêmes
 * données et mêmes règles que l'Atelier sur ordinateur : c'est le même site, à son adresse secrète.
 */
export default function ApplicationPage() {
  return (
    <div className="stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Application</h1>
        <p className="t-lead">L’Atelier sur votre téléphone, avec ses notifications.</p>
      </header>

      <ApplicationAtelier />

      <section className="panel stack-s" aria-labelledby="app-securite-title">
        <h2 id="app-securite-title" className="t-h3">
          Sécurité
        </h2>
        <ul className="application-regles">
          <li>L’application s’ouvre avec votre connexion habituelle : mot de passe et code, ou Face ID.</li>
          <li>Rien n’est gardé sur l’appareil : sans réseau, l’Atelier ne montre aucune donnée.</li>
          <li>Une notification ne montre jamais le nom, l’adresse ni le téléphone d’une cliente.</li>
          <li>
            « Fermer toutes les sessions », dans les <Link href={atelierHref("/reglages")}>Réglages</Link>, coupe aussi les notifications de tous les appareils.
          </li>
        </ul>
      </section>
    </div>
  );
}
