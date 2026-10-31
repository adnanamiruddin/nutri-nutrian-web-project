"""
Konversi database Excel (folder data-source/) menjadi JSON yang dibaca aplikasi (src/data/).

Pemakaian (dari folder root proyek):
    pip install pandas openpyxl
    python scripts/excel_to_json.py

File yang dibaca:
    data-source/Database_TKPI.xlsx            -> src/data/tkpi.json
    data-source/Database_NCPT_AD_BD_PD.xlsx   -> src/data/ncptAssessment.json

Ganti file Excel di data-source/ lalu jalankan ulang script ini setiap kali database diperbarui.
"""
import json
import math
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "data-source"
OUT_DIR = ROOT / "src" / "data"

NUTRIENTS = [
    ("AIR", "air"), ("ENERGI", "energi"), ("PROTEIN", "protein"), ("LEMAK", "lemak"), ("KH", "karbohidrat"),
    ("SERAT", "serat"), ("ABU", "abu"), ("KALSIUM", "kalsium"), ("FOSFOR", "fosfor"), ("BESI", "besi"),
    ("NATRIUM", "natrium"), ("KALIUM", "kalium"), ("TEMBAGA", "tembaga"), ("SENG", "seng"),
    ("RETINOL", "retinol"), ("B_KAR", "bKaroten"), ("KAR_TOTAL", "karotenTotal"), ("THIAMIN", "thiamin"),
    ("RIBOFLAVIN", "riboflavin"), ("NIASIN", "niasin"), ("VIT_C", "vitC"),
]
SUB_BY_CODE = {"R": "Tunggal/Single", "P": "Olahan/Produk/Komposit"}
NOISE = re.compile(r"\b(OLAHAN/PRODUK/KOMPOSIT|TUNGGAL/SINGLE|OLAHAN|KOMPOSIT)\b")


def clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return v


def num(v, d=2):
    v = clean(v)
    if v is None:
        return None
    try:
        return round(float(v), d)
    except (TypeError, ValueError):
        return None


def find_col(df, base):
    """Cari kolom 'ENERGI' atau 'ENERGI (kkal)'."""
    for c in df.columns:
        if str(c).split(" (")[0].strip().upper() == base:
            return c
    return None


def convert_tkpi():
    src = SRC_DIR / "Database_TKPI.xlsx"
    if not src.exists():
        print(f"[lewati] {src} tidak ditemukan")
        return
    df = pd.read_excel(src, sheet_name=0)
    items, kelompok_order = [], []
    for r in df.to_dict("records"):
        kode = str(clean(r.get("KODE")) or "").strip()
        if not re.fullmatch(r"[A-Z]{2}\d{3}[A-Z]?", kode):
            continue
        nama = NOISE.sub("", str(clean(r.get("NAMA_BAHAN")) or "")).strip(" ,")
        nama = re.sub(r"\s+", " ", nama)
        kel_raw = str(clean(r.get("KELOMPOK")) or "Lainnya")
        m = re.match(r"^(\d+\.\d+)\s+(.*)$", kel_raw)
        kel_no, kel = (m.group(1), m.group(2)) if m else ("", kel_raw)
        if (kel_no, kel) not in kelompok_order:
            kelompok_order.append((kel_no, kel))
        gizi = {key: num(r.get(find_col(df, col)), 2) for col, key in NUTRIENTS}
        flagged = clean(r.get("KOLOM_DITANDAI"))
        items.append({
            "kode": kode,
            "nama": nama,
            "kelompok": kel,
            "sub": SUB_BY_CODE.get(kode[1], "Lainnya"),
            "sumber": str(clean(r.get("SUMBER")) or ""),
            "bdd": num(r.get(find_col(df, "BDD")), 0),
            "gizi": gizi,
            "ditandai": [s.strip() for s in str(flagged).split(",")] if flagged else [],
        })
    kelompok_order.sort(key=lambda k: [int(x) for x in k[0].split(".")] if k[0] else [99])
    kel_names = [k for _, k in kelompok_order]
    sub_names = list(SUB_BY_CODE.values()) + ["Lainnya"]
    keys = [k for _, k in NUTRIENTS]
    # Format ringkas (baris = array) agar ukuran file kecil; diurai oleh src/utils/tkpi.js
    rows = [
        [i["kode"], i["nama"], kel_names.index(i["kelompok"]), sub_names.index(i["sub"]), i["sumber"], i["bdd"],
         [i["gizi"][k] for k in keys], ",".join(i["ditandai"])]
        for i in sorted(items, key=lambda i: i["kode"])
    ]
    out = {
        "_sumber": f"{src.name} (Tabel Komposisi Pangan Indonesia). Nilai per 100 g BDD; null = tidak ada data.",
        "kelompok": kel_names,
        "sub": sub_names,
        "nutrients": keys,
        "fields": ["kode", "nama", "kelompok", "sub", "sumber", "bdd", "gizi", "ditandai"],
        "rows": rows,
    }
    (OUT_DIR / "tkpi.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT_DIR / "tkpiMeta.json").write_text(json.dumps({"jumlah": len(items), "kelompok": len(kel_names)}), encoding="utf-8")
    print(f"[ok] tkpi.json: {len(items)} pangan, {len(kelompok_order)} kelompok")


def convert_ncpt():
    src = SRC_DIR / "Database_NCPT_AD_BD_PD.xlsx"
    if not src.exists():
        print(f"[lewati] {src} tidak ditemukan")
        return
    sheets = pd.read_excel(src, sheet_name=None)
    out = []
    for name, df in sheets.items():
        if "Kode_NCPT" not in df.columns:
            continue
        for r in df.to_dict("records"):
            code = clean(r.get("Kode_NCPT"))
            if not code:
                continue
            out.append({
                "domain": str(clean(r.get("Domain")) or code.split("-")[0]),
                "code": code,
                "anduid": int(r["ANDUID"]) if clean(r.get("ANDUID")) is not None else None,
                # buang judul sub-bagian PDF yang ikut terbaca, mis. "Normal stool Edema (6)" -> "Normal stool"
                "term": re.sub(r"\s+[A-Z][A-Za-z ,/&\-]*\(\d+\)$", "", str(clean(r.get("Istilah")) or "").strip()),
                "level": int(r["Level"]) if clean(r.get("Level")) is not None else None,
                "parent": clean(r.get("Kode_Induk")),
                "section": clean(r.get("Section")),
            })
    (OUT_DIR / "ncptAssessment.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = pd.Series([o["domain"] for o in out]).value_counts().to_dict()
    print(f"[ok] ncptAssessment.json: {len(out)} istilah {counts}")


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    convert_tkpi()
    convert_ncpt()
    sys.exit(0)
