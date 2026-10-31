import PageHeader from "@/components/ui/PageHeader";
import ZScoreCalculator from "@/components/calculators/ZScoreCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="Z-score anak" description="Status gizi dan tren pertumbuhan anak sesuai Permenkes RI No. 2 Tahun 2020: BB/U, PB/U atau TB/U, BB/PB atau BB/TB, dan IMT/U (0–60 bulan), serta IMT/U (5–18 tahun)." />
      <ZScoreCalculator />
    </>
  );
}
Page.title = "Z-score anak";
