export const POLL_INTERVAL_MS = 3000;

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) window.location.reload();
  if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
  return res.json() as Promise<T>;
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
