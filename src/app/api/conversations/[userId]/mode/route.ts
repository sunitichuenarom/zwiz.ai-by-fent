import { isAiConfigured } from "@/lib/ai";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { addSystemNote, getMode, setMode, userExists } from "@/lib/store";

type Context = { params: Promise<{ userId: string }> };

export async function POST(req: Request, { params }: Context) {
  if (!(await isAuthorized())) return unauthorized();
  const { userId } = await params;

  const body = (await req.json().catch(() => null)) as { mode?: unknown } | null;
  const mode = body?.mode;
  if (mode !== "human" && mode !== "ai") {
    return Response.json({ error: "mode ต้องเป็น human หรือ ai" }, { status: 400 });
  }
  if (!(await userExists(userId))) {
    return Response.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }
  if (mode === "ai" && !isAiConfigured()) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า DEEPSEEK_API_KEY จึงเปิด Zwiz AI ไม่ได้" },
      { status: 409 },
    );
  }

  if ((await getMode(userId)) !== mode) {
    await setMode(userId, mode);
    await addSystemNote(
      userId,
      mode === "ai" ? "แอดมินเปิดให้ Zwiz AI ตอบ" : "แอดมินรับช่วงต่อจาก Zwiz AI",
    );
  }
  return Response.json({ mode });
}
