import { useEffect, useRef } from "react";

/** Modal DaisyUI berbasis <dialog> yang dikendalikan oleh prop `open` */
export default function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className={`modal-box ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <form method="dialog">
          <button type="submit" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Tutup">
            ✕
          </button>
        </form>
        {title && <h3 className="pr-8 text-lg font-bold">{title}</h3>}
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Tutup">tutup</button>
      </form>
    </dialog>
  );
}
