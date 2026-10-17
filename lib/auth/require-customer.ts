import "server-only";
import { NextResponse } from "next/server";
import { getCustomerSession } from "./customer";
import type { CustomerSession } from "@/lib/customers/types";

/** Session cliente ou réponse 401 prête à renvoyer. */
export async function requireCustomer(): Promise<{ session: CustomerSession; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getCustomerSession();
  if (!session) return { error: NextResponse.json({ error: "Connexion nécessaire." }, { status: 401 }) };
  return { session };
}
