import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const generateMetadata = () => legalMetadata("confidentialite");

export default function Page() {
  return <LegalView page={legalPageView("confidentialite")} />;
}
