import PageHeader from "@/components/ui/PageHeader";
import CkdCalculator from "@/components/calculators/CkdCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="Penyakit ginjal kronis" description="Estimasi eGFR dengan CKD-EPI 2021 dan preskripsi protein serta energi berdasarkan KDOQI 2020." />
      <CkdCalculator />
    </>
  );
}
Page.title = "Penyakit ginjal kronis";
