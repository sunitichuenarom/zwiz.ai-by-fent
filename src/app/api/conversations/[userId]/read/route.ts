import { isAuthorized, unauthorized } from "@/lib/auth";
import { markRead, userExists } from "@/lib/store";

type Context = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Context) {
  if (!(await isAuthorized())) return unauthorized();
  const { userId } = await params;
  if (!(await userExists(userId))) {
    return Response.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }
  await markRead(userId);
  return Response.json({ ok: true });
}
