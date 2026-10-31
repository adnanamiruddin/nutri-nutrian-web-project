import PageHeader from "@/components/ui/PageHeader";
import AssessmentSearch from "@/components/search/AssessmentSearch";

export default function Page() {
  return (
    <>
      <PageHeader title="Istilah biokimia (BD)" description="Terminologi NCPT domain biokimia, tes medis, dan prosedur, dikelompokkan per profil laboratorium." />
      <AssessmentSearch domain="BD" />
    </>
  );
}
Page.title = "Istilah biokimia (BD)";
