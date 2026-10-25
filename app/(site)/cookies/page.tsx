import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const metadata = legalMetadata("cookies");

export default function Page() {
  return <LegalView page={legalPageView("cookies")} />;
}
