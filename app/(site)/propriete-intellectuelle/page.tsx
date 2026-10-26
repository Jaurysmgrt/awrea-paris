import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const generateMetadata = () => legalMetadata("propriete-intellectuelle");

export default function Page() {
  return <LegalView page={legalPageView("propriete-intellectuelle")} />;
}
