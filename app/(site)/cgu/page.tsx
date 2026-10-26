import { LegalView, legalMetadata, legalPageView } from "@/components/ui/LegalView";

export const generateMetadata = () => legalMetadata("cgu");

export default function Page() {
  return <LegalView page={legalPageView("cgu")} />;
}
