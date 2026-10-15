/** Transmet des documents de contenu aux composants interactifs qu'il enveloppe (voir Texts.tsx). */
import "server-only";
import type { ReactNode } from "react";
import { getDoc } from "@/lib/edition/read";
import { TextsProvider } from "./Texts";

export async function TextsRoot({ ids, children }: { ids: string[]; children: ReactNode }) {
  const docs = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await getDoc(id)] as const)));
  return <TextsProvider docs={docs}>{children}</TextsProvider>;
}
