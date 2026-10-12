import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("mentions-legales");

export default function Page() {
  return <LegalView slug="mentions-legales" />;
}
