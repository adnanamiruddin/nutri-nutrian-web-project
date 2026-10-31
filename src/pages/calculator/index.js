import { useRouter } from "next/router";
import PageHeader from "@/components/ui/PageHeader";
import AnthropometryCalculator from "@/components/calculators/AnthropometryCalculator";
import BmrCalculator from "@/components/calculators/BmrCalculator";
import CkdCalculator from "@/components/calculators/CkdCalculator";
import ZScoreCalculator from "@/components/calculators/ZScoreCalculator";

const TABS = [
  { key: "status", label: "Status gizi dewasa", el: AnthropometryCalculator },
  { key: "zscore", label: "Z-score anak", el: ZScoreCalculator },
  { key: "bmr", label: "BMR/TEE", el: BmrCalculator },
  { key: "egfr", label: "eGFR", el: CkdCalculator },
];

/** Kalkulator multi-tab; tab aktif disimpan di URL (?tab=) agar bisa dibagikan */
export default function CalculatorHub() {
  const router = useRouter();
  const active = TABS.find((t) => t.key === router.query.tab) || TABS[0];
  const Active = active.el;
  const go = (key) => router.replace({ pathname: "/calculator", query: { tab: key } }, undefined, { shallow: true, scroll: false });

  return (
    <>
      <PageHeader
        title="Kalkulator gizi klinis & antropometri"
        description="Data dari profil pasien terisi otomatis di setiap tab. Kalkulator khusus lain tersedia di menu samping."
      />
      <div role="tablist" className="tabs tabs-border mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active.key}
            className={`tab whitespace-nowrap font-semibold ${t.key === active.key ? "tab-active" : ""}`}
            onClick={() => go(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Active key={active.key} />
    </>
  );
}
CalculatorHub.title = "Kalkulator";
