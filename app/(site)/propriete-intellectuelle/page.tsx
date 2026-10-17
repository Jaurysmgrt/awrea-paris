import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("propriete-intellectuelle");

export default function Page() {
  return <LegalView slug="propriete-intellectuelle" />;
}
