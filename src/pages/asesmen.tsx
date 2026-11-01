import AssessmentWorksheet from "@/components/layouts/page-components/dashboard/assessment/AssessmentWorksheet";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Pengkajian Gizi (AD/BD/PD)"
        description="Susun tabel pengkajian antropometri, biokimia, dan fisik/klinis dengan kode NCPT. Interpretasi biokimia terisi otomatis dari nilai normal."
      />
      <AssessmentWorksheet />
    </>
  );
}
