import DiabetesCalculator from "@/components/layouts/page-components/dashboard/calculators/DiabetesCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Diabetes Melitus"
        description="Kebutuhan energi menurut PERKENI: kebutuhan basal per kg BB ideal dengan koreksi umur, aktivitas, berat badan, dan stres."
      />
      <DiabetesCalculator />
    </>
  );
}
