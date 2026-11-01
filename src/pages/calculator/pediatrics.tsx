import ZScoreCalculator from "@/components/layouts/page-components/dashboard/calculators/ZScoreCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Z-Score Anak"
        description="Status gizi dan tren pertumbuhan anak sesuai Permenkes RI No. 2 Tahun 2020: BB/U, PB/U atau TB/U, BB/PB atau BB/TB, dan IMT/U (0–60 bulan), serta IMT/U (5–18 tahun)."
      />
      <ZScoreCalculator />
    </>
  );
}
