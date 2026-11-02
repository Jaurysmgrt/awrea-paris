import { NextResponse } from "next/server";
import { currentAdmin, setPasskeyChallenge } from "@/lib/auth/admin";
import { getAccount } from "@/lib/auth/accounts";
import { optionsAjout } from "@/lib/auth/passkeys";

/** Réglages › Sécurité : ajouter Face ID ou l'empreinte de cet appareil, étape 1. Session ouverte seulement. */
export async function POST(req: Request) {
  const email = await currentAdmin();
  const account = email ? await getAccount(email) : null;
  if (!account) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const options = await optionsAjout(account, req);
  await setPasskeyChallenge(options.challenge, "ajout");
  return NextResponse.json(options);
}
