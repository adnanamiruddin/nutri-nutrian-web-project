import CalculatorHub from "@/components/layouts/page-components/dashboard/calculators/CalculatorHub";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Kalkulator Gizi Klinis & Antropometri"
        description="Data dari profil pasien terisi otomatis di setiap tab. Kalkulator khusus lain tersedia di menu samping."
      />
      <CalculatorHub />
    </>
  );
}
