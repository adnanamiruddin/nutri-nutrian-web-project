/** Peringatan input tidak valid (gaya sama dengan peringatan di kalkulator BMR) */
export default function InputAlert({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="alert alert-warning alert-soft text-sm">
      {errors.length === 1 ? (
        <span>{errors[0]}</span>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
