import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("retractation");

export default function Page() {
  return <LegalView slug="retractation" />;
}
