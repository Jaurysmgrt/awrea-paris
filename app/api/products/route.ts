import { NextResponse } from "next/server";
import { getPublicProducts } from "@/lib/commerce";

/** Catalogue public léger (liste d'envies, assistant) : jamais les pièces d'un drop pas encore ouvert. */
export async function GET(req: Request) {
  const handles = new URL(req.url).searchParams.get("handles")?.split(",").filter(Boolean);
  const all = await getPublicProducts();
  const list = handles ? all.filter((p) => handles.includes(p.handle)) : all;
  return NextResponse.json({ products: list });
}
