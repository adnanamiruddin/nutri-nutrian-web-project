/**
 * helpers/reference-data.ts
 * Titik masuk bertipe untuk data rujukan JSON (hasil scripts/excel_to_json.py dan data statis).
 */
import akgRaw from "@/data/akg2019.json";
import ncpRaw from "@/data/ncpDomains.json";
import termsRaw from "@/data/ncptAssessment.json";
import tkpiMetaRaw from "@/data/tkpiMeta.json";

export type AssessmentDomain = "AD" | "BD" | "PD";
export type NcpDomainKey = "NI" | "NC" | "NB";

export interface NcptTerm {
  domain: AssessmentDomain;
  code: string;
  anduid: number | null;
  term: string;
  level: number | null;
  parent: string | null;
  section: string | null;
}

export interface NcpItem {
  code: string;
  domain: NcpDomainKey;
  class: string;
  problem: string;
  problemEn: string;
  definition: string;
  etiology: string[];
  signs: string[];
}

export interface AkgItem {
  label: string;
  sex: "all" | "male" | "female";
  minAge: number;
  maxAge: number;
  energi: number;
  protein: number;
  lemak: number;
  karbohidrat: number;
  serat: number;
  air: number;
  kalsium: number;
  besi: number;
  vitC: number;
}

export const NCPT_TERMS = termsRaw as unknown as NcptTerm[];
export const NCPT_BY_CODE: Record<string, NcptTerm> = Object.fromEntries(NCPT_TERMS.map((t) => [t.code, t]));

export const NCP = ncpRaw as unknown as { _catatan: string; domains: Record<NcpDomainKey, string>; items: NcpItem[] };

export const AKG = akgRaw as unknown as { _catatan: string; items: AkgItem[] };

export const TKPI_META = tkpiMetaRaw as { jumlah: number; kelompok: number };
