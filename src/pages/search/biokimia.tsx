import AssessmentSearch from "@/components/layouts/page-components/dashboard/search/AssessmentSearch";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Istilah Biokimia (BD)"
        description="Terminologi NCPT domain biokimia, tes medis, dan prosedur, dikelompokkan per profil laboratorium."
      />
      <AssessmentSearch domain="BD" />
    </>
  );
}
