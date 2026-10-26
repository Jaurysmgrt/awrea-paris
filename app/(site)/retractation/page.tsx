import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const generateMetadata = () => legalMetadata("retractation");

export default function Page() {
  return <LegalView page={legalPageView("retractation")} />;
}
