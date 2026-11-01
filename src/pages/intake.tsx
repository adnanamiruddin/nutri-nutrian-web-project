import IntakeAnalyzer from "@/components/layouts/page-components/dashboard/intake/IntakeAnalyzer";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Preskripsi & Analisis Menu"
        description="Masukkan hasil recall 24 jam atau SQ-FFQ, lalu bandingkan asupan dengan AKG 2019 atau preskripsi Anda."
      />
      <IntakeAnalyzer />
    </>
  );
}
