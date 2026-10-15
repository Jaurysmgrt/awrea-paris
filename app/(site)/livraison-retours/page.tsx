import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("livraison-retours");

export default function Page() {
  return <LegalView slug="livraison-retours" />;
}
