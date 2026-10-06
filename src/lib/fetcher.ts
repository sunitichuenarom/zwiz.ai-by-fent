export const FALLBACK_POLL_MS = 30_000;

export const DEMO_NOTICE = "เดโมสำหรับแบบทดสอบ ไม่ใช่ผลิตภัณฑ์ทางการของ ZWIZ.AI";

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) window.location.reload();
  if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
  return res.json() as Promise<T>;
}

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

function clock(date: Date): string {
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return isToday(date) ? clock(date) : shortDate(date);
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return "ยังไม่มีข้อความ";
  const date = new Date(timestamp);
  return `${isToday(date) ? "วันนี้" : shortDate(date)} ${clock(date)} น.`;
}
