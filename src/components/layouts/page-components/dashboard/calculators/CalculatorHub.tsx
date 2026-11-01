import { useRouter } from "next/router";
import type { ComponentType } from "react";
import AnthropometryCalculator from "@/components/layouts/page-components/dashboard/calculators/AnthropometryCalculator";
import BmrTeeCalculator from "@/components/layouts/page-components/dashboard/calculators/BmrTeeCalculator";
import CkdCalculator from "@/components/layouts/page-components/dashboard/calculators/CkdCalculator";
import ZScoreCalculator from "@/components/layouts/page-components/dashboard/calculators/ZScoreCalculator";

/**
 * Tab memakai komponen kalkulator yang SAMA dengan halaman khususnya
 * (mis. tab BMR/TEE = halaman /calculator/bmr-tee), sehingga logika dan hasilnya selalu selaras.
 */
const TABS: { key: string; label: string; el: ComponentType }[] = [
  { key: "status", label: "Status gizi dewasa", el: AnthropometryCalculator },
  { key: "zscore", label: "Z-score anak", el: ZScoreCalculator },
  { key: "bmr", label: "BMR/TEE", el: BmrTeeCalculator },
  { key: "egfr", label: "eGFR", el: CkdCalculator },
];

/** Kalkulator multi-tab; tab aktif disimpan di URL (?tab=) agar bisa dibagikan */
export default function CalculatorHub() {
  const router = useRouter();
  const active = TABS.find((t) => t.key === router.query.tab) || TABS[0];
  const Active = active.el;
  const go = (key: string) => router.replace({ pathname: "/calculator", query: { tab: key } }, undefined, { shallow: true, scroll: false });

  return (
    <>
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
