import PageHeader from "@/components/ui/PageHeader";
import AssessmentSearch from "@/components/search/AssessmentSearch";

export default function Page() {
  return (
    <>
      <PageHeader title="Istilah antropometri (AD)" description="Terminologi NCPT domain antropometri: tinggi, berat, perubahan berat, IMT, indeks pertumbuhan, dan komposisi tubuh." />
      <AssessmentSearch domain="AD" />
    </>
  );
}
Page.title = "Istilah antropometri (AD)";
