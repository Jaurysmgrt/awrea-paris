import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("confidentialite");

export default function Page() {
  return <LegalView slug="confidentialite" />;
}
