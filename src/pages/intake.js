import PageHeader from "@/components/ui/PageHeader";
import IntakeAnalyzer from "@/components/intake/IntakeAnalyzer";

export default function Page() {
  return (
    <>
      <PageHeader title="Preskripsi & analisis menu" description="Masukkan hasil recall 24 jam atau SQ-FFQ, lalu bandingkan asupan dengan AKG 2019 atau preskripsi Anda." />
      <IntakeAnalyzer />
    </>
  );
}
Page.title = "Preskripsi & analisis menu";
