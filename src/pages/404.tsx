import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Halaman Tidak Ditemukan</h1>
      <p className="mt-2 text-base-content/70">Alamat yang Anda buka tidak tersedia. Kembali ke ringkasan untuk memilih alat.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Kembali ke ringkasan
      </Link>
    </div>
  );
}
