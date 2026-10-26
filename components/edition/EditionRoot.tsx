/**
 * Point d'entrée de l'éditeur dans la mise en page racine : rien pour le public ni pour un cookie
 * de Draft Mode sans session de l'Atelier. Pour la créatrice en mode Édition, l'adresse secrète de
 * l'Atelier (pour l'API de l'éditeur) et le guide de prise en main la première fois.
 */
import "server-only";
import { kv } from "@/lib/store";
import { atelierBase } from "@/lib/admin/path";
import { currentAdmin } from "@/lib/auth/admin";
import { isEditing } from "@/lib/edition/read";
import { EditionLoader } from "./EditionLoader";

export async function EditionRoot() {
  if (!(await isEditing())) return null;
  const [email, base] = [await currentAdmin(), atelierBase()];
  if (!email || !base) return null;
  const guideDone = Boolean(await kv.get<string>(`edition:guide:${email}`).catch(() => null));
  return <EditionLoader base={base} email={email} guideDone={guideDone} />;
}
