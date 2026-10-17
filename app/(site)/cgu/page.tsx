import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("cgu");

export default function Page() {
  return <LegalView slug="cgu" />;
}
