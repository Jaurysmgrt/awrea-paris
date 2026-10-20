import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const metadata = legalMetadata("confidentialite");

export default function Page() {
  return <LegalView page={legalPageView("confidentialite")} />;
}
