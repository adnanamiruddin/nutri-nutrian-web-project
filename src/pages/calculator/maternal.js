import PageHeader from "@/components/ui/PageHeader";
import MaternalCalculator from "@/components/calculators/MaternalCalculator";

export default function Page() {
  return (
    <>
      <PageHeader title="Ibu hamil & menyusui" description="Tambahan energi per trimester atau masa menyusui, beserta pemantauan kenaikan berat badan kehamilan." />
      <MaternalCalculator />
    </>
  );
}
Page.title = "Ibu hamil & menyusui";
