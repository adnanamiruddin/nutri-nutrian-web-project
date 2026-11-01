import TkpiSearch from "@/components/layouts/page-components/dashboard/search/TkpiSearch";
import PageHeader from "@/components/utils/generals/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader
        title="Database TKPI"
        description="Tabel Komposisi Pangan Indonesia: 1.145 bahan pangan dengan 21 zat gizi per 100 g BDD. Pilih baris untuk detail dan hitung per porsi. Tambah, ubah, hapus, dan pulihkan data memerlukan kode rahasia."
      />
      <TkpiSearch />
    </>
  );
}
