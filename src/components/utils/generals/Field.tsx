import type { ReactNode } from "react";
import type { SelectOption, Sex } from "@/types";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Kolom input bertabel (DaisyUI fieldset) */
export default function Field({ label, hint, children, className = "" }: FieldProps) {
  return (
    <fieldset className={`fieldset py-1 ${className}`}>
      <legend className="fieldset-legend text-[0.8rem] font-semibold text-base-content/80">{label}</legend>
      {children}
      {hint && <p className="label whitespace-normal text-xs text-base-content/55">{hint}</p>}
    </fieldset>
  );
}

interface NumberFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  min?: number;
  step?: string;
  placeholder?: string;
  className?: string;
}

/** Input angka dengan satuan di sisi kanan */
export function NumberField({ label, hint, value, onChange, unit, min = 0, step = "any", placeholder, className }: NumberFieldProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <label className="input w-full">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tabular-nums"
        />
        {unit && <span className="text-xs text-base-content/50">{unit}</span>}
      </label>
    </Field>
  );
}

interface SelectFieldProps<T extends string> {
  label: ReactNode;
  hint?: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: (SelectOption & { value: T })[];
  className?: string;
}

export function SelectField<T extends string>({ label, hint, value, onChange, options, className }: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select className="select w-full" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const SEX_OPTIONS: { v: Sex; l: string }[] = [
  { v: "female", l: "Perempuan" },
  { v: "male", l: "Laki-laki" },
];

export function SexField({ value, onChange, label = "Jenis kelamin" }: { value: Sex; onChange: (v: Sex) => void; label?: string }) {
  return (
    <Field label={label}>
      <div className="join w-full" role="radiogroup">
        {SEX_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.v}
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`btn join-item flex-1 ${value === o.v ? "btn-primary" : "btn-outline border-base-300 font-medium"}`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </Field>
  );
}
