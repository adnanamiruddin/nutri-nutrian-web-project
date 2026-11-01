/**
 * Penjagaan aksi yang mengubah data TKPI (tambah, ubah, hapus, pulihkan).
 * Menampilkan popup SweetAlert2 yang meminta kode rahasia; kode dicocokkan di server.
 */
import { LuShieldAlert } from "react-icons/lu";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { verifySecretCode } from "@/api/modules/auth";
import { swalTarget } from "@/components/utils/alerts/notify";

const ReactSwal = withReactContent(Swal);

/** @returns true bila kode benar; false bila dibatalkan */
export async function requestSecretAccess(action: string): Promise<boolean> {
  const result = await ReactSwal.fire({
    target: swalTarget(),
    icon: "warning",
    iconHtml: <LuShieldAlert className="h-12 w-12" aria-hidden />,
    title: "Akses terbatas",
    html: (
      <p className="text-sm leading-relaxed text-base-content/70">
        Aksi <strong className="text-base-content">{action}</strong> akan mengubah data bahan pangan. Bagian ini dijaga,
        silakan masukkan kode unik untuk melanjutkan.
      </p>
    ),
    input: "password",
    inputPlaceholder: "Kode rahasia",
    inputAttributes: { autocomplete: "off", autocapitalize: "off", "aria-label": "Kode rahasia" },
    showCancelButton: true,
    confirmButtonText: "Verifikasi",
    cancelButtonText: "Batal",
    reverseButtons: true,
    focusConfirm: false,
    buttonsStyling: false,
    customClass: {
      popup: "nn-swal",
      icon: "nn-swal-guard-icon",
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-ghost",
      actions: "gap-2",
    },
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    inputValidator: (value: string) => (value.trim() ? null : "Kode rahasia wajib diisi."),
    preConfirm: async (code: string) => {
      const res = await verifySecretCode(code);
      if (!res.valid) {
        Swal.showValidationMessage(res.message || "Kode rahasia salah. Akses ditolak.");
        return false;
      }
      return true;
    },
  });
  return result.isConfirmed;
}
