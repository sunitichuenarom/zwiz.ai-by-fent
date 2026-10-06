import { after, NextResponse } from "next/server";
import { validateSignature, type webhook } from "@line/bot-sdk";
import { env } from "@/lib/env";
import { handleEvent } from "@/lib/line";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!signature || !validateSignature(body, env.LINE_CHANNEL_SECRET, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const { events = [] } = JSON.parse(body) as { events?: webhook.Event[] };

  after(async () => {
    for (const event of events) {
      try {
        await handleEvent(event);
      } catch (error) {
        console.error("handleEvent failed", error);
      }
    }
  });

  return NextResponse.json({ ok: true });
}
