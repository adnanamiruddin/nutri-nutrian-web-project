import PageHeader from "@/components/ui/PageHeader";
import PesGenerator from "@/components/calculators/PesGenerator";

export default function Page() {
  return (
    <>
      <PageHeader title="Diagnosis gizi (PES)" description="Pilih problem, etiology, dan tanda/gejala untuk menyusun kalimat diagnosis gizi terstandar." />
      <PesGenerator />
    </>
  );
}
Page.title = "Diagnosis gizi (PES)";
