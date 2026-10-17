import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("assistant-ia");

export default function Page() {
  return <LegalView slug="assistant-ia" />;
}
