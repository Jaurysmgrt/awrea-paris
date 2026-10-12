import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/commerce";

/** Catalogue public léger (liste d'envies, assistant) */
export async function GET(req: Request) {
  const handles = new URL(req.url).searchParams.get("handles")?.split(",").filter(Boolean);
  const all = await getAllProducts();
  const list = handles ? all.filter((p) => handles.includes(p.handle)) : all;
  return NextResponse.json({ products: list });
}
