/**
 * api/clients/http-client.ts
 * Pembungkus fetch JSON untuk memanggil API route internal (/api/*).
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as TResponse & { message?: string };
  if (!res.ok) throw new HttpError(res.status, data.message || `Permintaan gagal (${res.status})`);
  return data;
}
