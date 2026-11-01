import EnteralCalculator from "@/components/layouts/page-components/dashboard/calculators/EnteralCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Enteral & Parenteral"
        description="Rasio kalori non-protein terhadap nitrogen, laju infus glukosa, dan estimasi osmolaritas larutan parenteral."
      />
      <EnteralCalculator />
    </>
  );
}
