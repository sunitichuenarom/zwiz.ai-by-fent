import { signIn } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { passcode?: unknown } | null;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!(await signIn(passcode))) {
    return Response.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }
  return Response.json({ ok: true });
}
