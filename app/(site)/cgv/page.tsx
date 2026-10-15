import { LegalView, legalMetadata } from "@/components/ui/LegalView";

export const metadata = legalMetadata("cgv");

export default function Page() {
  return <LegalView slug="cgv" />;
}
