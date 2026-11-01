import { timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { VerifyCodeResult } from "@/api/modules/auth";

/** Jeda kecil saat kode salah untuk memperlambat tebakan beruntun */
const FAIL_DELAY_MS = 600;

/** Bandingkan string dengan waktu konstan (mencegah timing attack) */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyCodeResult>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ valid: false, message: "Metode tidak diizinkan." });
  }

  const secret = process.env.SECRET_CODE;
  if (!secret) {
    return res.status(500).json({ valid: false, message: "Kode rahasia belum dikonfigurasi di server (SECRET_CODE)." });
  }

  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (code && safeEqual(code, secret)) return res.status(200).json({ valid: true });

  await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
  return res.status(401).json({ valid: false, message: "Kode rahasia salah. Akses ditolak." });
}
