import { isPasscodeEnabled, signIn } from "@/lib/auth";
import { clearLoginAttempts, countLoginAttempt } from "@/lib/store";

const MAX_ATTEMPTS = 20;
const BLOCK_CACHE_MS = 60_000;
const MAX_CACHED_IPS = 1000;
const blockedUntil = new Map<string, number>();

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function tooManyAttempts(): Response {
  return Response.json(
    { error: "กรอกรหัสผิดหลายครั้งเกินไป รอ 10 นาทีแล้วลองใหม่" },
    { status: 429 },
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { passcode?: unknown } | null;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!isPasscodeEnabled()) return Response.json({ ok: true });

  const ip = clientIp(req);
  if ((blockedUntil.get(ip) ?? 0) > Date.now()) return tooManyAttempts();
  if ((await countLoginAttempt(ip)) > MAX_ATTEMPTS) {
    if (blockedUntil.size >= MAX_CACHED_IPS) blockedUntil.clear();
    blockedUntil.set(ip, Date.now() + BLOCK_CACHE_MS);
    return tooManyAttempts();
  }

  if (!(await signIn(passcode))) {
    return Response.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }
  await clearLoginAttempts(ip);
  return Response.json({ ok: true });
}
