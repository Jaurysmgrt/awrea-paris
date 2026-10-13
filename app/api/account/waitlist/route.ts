import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/require-customer";
import { listWaitlist, removeWaitlist } from "@/lib/customers";

export async function DELETE(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[A-Za-z0-9:_-]{1,80}$/.test(id)) return NextResponse.json({ error: "Inscription inconnue." }, { status: 400 });
  await removeWaitlist(session, id);
  return NextResponse.json({ waitlist: await listWaitlist(session) });
}
