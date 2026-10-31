import PageHeader from "@/components/ui/PageHeader";
import AssessmentSearch from "@/components/search/AssessmentSearch";

export default function Page() {
  return (
    <>
      <PageHeader title="Istilah fisik/klinis (PD)" description="Terminologi NCPT temuan fisik terfokus gizi, termasuk tanda vital dan sistem organ." />
      <AssessmentSearch domain="PD" />
    </>
  );
}
Page.title = "Istilah fisik/klinis (PD)";
