import AssessmentSearch from "@/components/layouts/page-components/dashboard/search/AssessmentSearch";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Istilah Antropometri (AD)"
        description="Terminologi NCPT domain antropometri: tinggi, berat, perubahan berat, IMT, indeks pertumbuhan, dan komposisi tubuh."
      />
      <AssessmentSearch domain="AD" />
    </>
  );
}
