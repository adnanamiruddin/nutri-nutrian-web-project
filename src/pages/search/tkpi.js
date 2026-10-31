import PageHeader from "@/components/ui/PageHeader";
import TkpiSearch from "@/components/search/TkpiSearch";

export default function Page() {
  return (
    <>
      <PageHeader title="Database TKPI" description="Tabel Komposisi Pangan Indonesia: 1.145 bahan pangan dengan 21 zat gizi per 100 g BDD. Pilih baris untuk detail dan hitung per porsi." />
      <TkpiSearch />
    </>
  );
}
Page.title = "Database TKPI";
