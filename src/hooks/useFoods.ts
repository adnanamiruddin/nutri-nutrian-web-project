import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { KELOMPOK, mergeFoods } from "@/helpers/tkpi";

/** Daftar bahan pangan TKPI + tambahan pengguna (reaktif terhadap perubahan) */
export default function useFoods() {
  const { customFoods } = useApp();
  return useMemo(() => {
    const { all, byCode, custom } = mergeFoods(customFoods);
    const kelompok = [...KELOMPOK, ...[...new Set(custom.map((f) => f.kelompok))].filter((k) => !KELOMPOK.includes(k))];
    return { foods: all, byCode, custom, kelompok };
  }, [customFoods]);
}
