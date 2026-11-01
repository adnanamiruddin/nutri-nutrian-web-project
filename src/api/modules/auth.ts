/**
 * api/modules/auth.ts
 * Verifikasi kode rahasia untuk aksi yang mengubah data (TKPI).
 * Pencocokan dilakukan di server (pages/api/auth/verify-code.ts) agar kode tidak ikut ke bundle browser.
 */
import { HttpError, postJson } from "@/api/clients/http-client";

export interface VerifyCodeResult {
  valid: boolean;
  message?: string;
}

export async function verifySecretCode(code: string): Promise<VerifyCodeResult> {
  try {
    return await postJson<VerifyCodeResult>("/api/auth/verify-code", { code });
  } catch (e) {
    if (e instanceof HttpError) return { valid: false, message: e.message };
    return { valid: false, message: "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi." };
  }
}
