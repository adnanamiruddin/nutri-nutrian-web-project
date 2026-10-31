import PageHeader from "@/components/ui/PageHeader";
import EnteralCalculator from "@/components/calculators/EnteralCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="Enteral & parenteral" description="Rasio kalori non-protein terhadap nitrogen, laju infus glukosa, dan estimasi osmolaritas larutan parenteral." />
      <EnteralCalculator />
    </>
  );
}
Page.title = "Enteral & parenteral";
