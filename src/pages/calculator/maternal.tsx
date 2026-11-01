import MaternalCalculator from "@/components/layouts/page-components/dashboard/calculators/MaternalCalculator";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Ibu Hamil & Menyusui"
        description="Tambahan energi per trimester atau masa menyusui, beserta pemantauan kenaikan berat badan kehamilan."
      />
      <MaternalCalculator />
    </>
  );
}
