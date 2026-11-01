import PesGenerator from "@/components/layouts/page-components/dashboard/diagnosis/PesGenerator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Diagnosis Gizi (PES)"
        description="Pilih problem, etiology, dan tanda/gejala untuk menyusun kalimat diagnosis gizi terstandar."
      />
      <PesGenerator />
    </>
  );
}
