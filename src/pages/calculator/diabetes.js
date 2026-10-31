import PageHeader from "@/components/ui/PageHeader";
import DiabetesCalculator from "@/components/calculators/DiabetesCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="Diabetes melitus" description="Kebutuhan energi menurut PERKENI: kebutuhan basal per kg BB ideal dengan koreksi umur, aktivitas, berat badan, dan stres." />
      <DiabetesCalculator />
    </>
  );
}
Page.title = "Diabetes melitus";
