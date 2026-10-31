export default function PageHeader({ title, description, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-base-content md:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-[0.95rem] leading-relaxed text-base-content/70">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 print:hidden">{children}</div>}
    </header>
  );
}
