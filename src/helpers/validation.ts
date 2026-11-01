/**
 * helpers/validation.ts
 * Penjagaan input runtime. TypeScript hanya memeriksa tipe saat kompilasi; nilai dari form
 * tetap string bebas saat aplikasi berjalan, jadi rentang angka tetap perlu dicek di sini.
 */
import type { InputLimit } from "@/const/input-limits";
import { fmt, num } from "@/helpers/formulas";

export interface RangeCheck {
  value: string | number | null | undefined;
  limit: InputLimit;
  /** Ganti label bawaan bila perlu (mis. "BB saat ini") */
  label?: string;
}

export const isFilled = (v: unknown): boolean => v !== "" && v !== null && v !== undefined;

/**
 * Cek setiap nilai yang SUDAH diisi terhadap batasnya.
 * Nilai kosong diabaikan; kelengkapan data ditangani oleh pesan "isi data..." di masing-masing kalkulator.
 */
export function validateRanges(checks: RangeCheck[]): string[] {
  const errors: string[] = [];
  checks.forEach(({ value, limit, label }) => {
    if (!isFilled(value)) return;
    const name = label ?? limit.label;
    const v = num(value);
    const unit = limit.unit ? ` ${limit.unit}` : "";
    if (!Number.isFinite(v)) {
      errors.push(`${name} harus berupa angka.`);
      return;
    }
    const tooLow = limit.exclusiveMin ? v <= limit.min : v < limit.min;
    if (tooLow || v > limit.max) {
      errors.push(
        limit.exclusiveMin
          ? `${name} harus lebih dari ${fmt(limit.min)} dan maksimal ${fmt(limit.max)}${unit}.`
          : `${name} harus di antara ${fmt(limit.min)}–${fmt(limit.max)}${unit}.`,
      );
    }
  });
  return errors;
}
