import CkdCalculator from "@/components/layouts/page-components/dashboard/calculators/CkdCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Penyakit Ginjal Kronis"
        description="Estimasi eGFR dengan CKD-EPI 2021 dan preskripsi protein serta energi berdasarkan KDOQI 2020."
      />
      <CkdCalculator />
    </>
  );
}
