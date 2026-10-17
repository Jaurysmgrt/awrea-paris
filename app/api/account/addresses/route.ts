import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/require-customer";
import { deleteAddress, listAddresses, saveAddress } from "@/lib/customers";

const Address = z.object({
  id: z.string().max(64).optional(),
  label: z.string().trim().max(40).nullable().default(null),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).nullable().default(null),
  postalCode: z.string().trim().min(2).max(20),
  city: z.string().trim().min(1).max(80),
  country: z.string().length(2).toUpperCase(),
  phone: z.string().trim().max(30).nullable().default(null),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const { session, error } = await requireCustomer();
  if (error) return error;
  return NextResponse.json({ addresses: await listAddresses(session) });
}

export async function PUT(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const parsed = Address.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de compléter l’adresse (nom, adresse, code postal, ville, pays)." }, { status: 400 });
  return NextResponse.json({ addresses: await saveAddress(session, parsed.data) });
}

export async function DELETE(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Adresse inconnue." }, { status: 400 });
  return NextResponse.json({ addresses: await deleteAddress(session, id) });
}
