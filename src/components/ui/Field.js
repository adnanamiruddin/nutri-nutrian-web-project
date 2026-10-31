/** Kolom input bertabel (DaisyUI fieldset) */
export default function Field({ label, hint, children, className = "" }) {
  return (
    <fieldset className={`fieldset py-1 ${className}`}>
      <legend className="fieldset-legend text-[0.8rem] font-semibold text-base-content/80">{label}</legend>
      {children}
      {hint && <p className="label whitespace-normal text-xs text-base-content/55">{hint}</p>}
    </fieldset>
  );
}

/** Input angka dengan satuan di sisi kanan */
export function NumberField({ label, hint, value, onChange, unit, min = 0, step = "any", placeholder, className }) {
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

export function SelectField({ label, hint, value, onChange, options, className }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select className="select w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SexField({ value, onChange, label = "Jenis kelamin" }) {
  return (
    <Field label={label}>
      <div className="join w-full" role="radiogroup">
        {[
          { v: "female", l: "Perempuan" },
          { v: "male", l: "Laki-laki" },
        ].map((o) => (
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
