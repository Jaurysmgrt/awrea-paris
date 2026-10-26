import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const generateMetadata = () => legalMetadata("assistant-ia");

export default function Page() {
  return <LegalView page={legalPageView("assistant-ia")} />;
}
