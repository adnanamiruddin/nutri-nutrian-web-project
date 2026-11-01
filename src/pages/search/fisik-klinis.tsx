import AssessmentSearch from "@/components/layouts/page-components/dashboard/search/AssessmentSearch";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Istilah Fisik/Klinis (PD)"
        description="Terminologi NCPT temuan fisik terfokus gizi, termasuk tanda vital dan sistem organ."
      />
      <AssessmentSearch domain="PD" />
    </>
  );
}
