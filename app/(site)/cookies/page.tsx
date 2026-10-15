import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("cookies");

export default function Page() {
  return <LegalView slug="cookies" />;
}
