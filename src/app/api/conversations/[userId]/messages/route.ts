import { isAuthorized, unauthorized } from "@/lib/auth";
import { pushErrorMessage, pushText } from "@/lib/line";
import { addMessage, listMessages, userExists } from "@/lib/store";

const MAX_TEXT_LENGTH = 5000;

type Context = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Context) {
  if (!(await isAuthorized())) return unauthorized();
  const { userId } = await params;
  return Response.json(await listMessages(userId));
}

export async function POST(req: Request, { params }: Context) {
  if (!(await isAuthorized())) return unauthorized();
  const { userId } = await params;

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json({ error: "ข้อความว่าง" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `ข้อความยาวเกิน ${MAX_TEXT_LENGTH} ตัวอักษร` },
      { status: 400 },
    );
  }
  if (!(await userExists(userId))) {
    return Response.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }

  let message;
  try {
    message = await pushText(userId, text);
  } catch (error) {
    console.error("pushMessage failed", error);
    return Response.json({ error: pushErrorMessage(error) }, { status: 502 });
  }

  await addMessage(message);
  return Response.json(message);
}
