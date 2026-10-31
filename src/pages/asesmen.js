import PageHeader from "@/components/ui/PageHeader";
import AssessmentWorksheet from "@/components/assessment/AssessmentWorksheet";

export default function Page() {
  return (
    <>
      <PageHeader title="Pengkajian gizi (AD/BD/PD)" description="Susun tabel pengkajian antropometri, biokimia, dan fisik/klinis dengan kode NCPT. Interpretasi biokimia terisi otomatis dari nilai normal." />
      <AssessmentWorksheet />
    </>
  );
}
Page.title = "Pengkajian gizi (AD/BD/PD)";
