import PageHeader from "@/components/ui/PageHeader";
import BmrCalculator from "@/components/calculators/BmrCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="BMR & TEE" description="Hitung kebutuhan energi basal dan total dengan faktor aktivitas dan stres. Rumus dipilih otomatis sesuai umur, IMT, dan kondisi klinis." />
      <BmrCalculator />
    </>
  );
}
Page.title = "BMR & TEE";
