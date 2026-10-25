import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const metadata = legalMetadata("retractation");

export default function Page() {
  return <LegalView page={legalPageView("retractation")} />;
}
