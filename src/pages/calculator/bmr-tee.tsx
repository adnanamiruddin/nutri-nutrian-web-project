import BmrTeeCalculator from "@/components/layouts/page-components/dashboard/calculators/BmrTeeCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="BMR & TEE"
        description="Hitung kebutuhan energi basal dan total dengan faktor aktivitas dan stres. Rumus dipilih otomatis sesuai umur, IMT, dan kondisi klinis."
      />
      <BmrTeeCalculator />
    </>
  );
}
