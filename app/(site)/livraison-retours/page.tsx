import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const metadata = legalMetadata("livraison-retours");

export default function Page() {
  return <LegalView page={legalPageView("livraison-retours")} />;
}
