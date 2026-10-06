import { after, NextResponse } from "next/server";
import { validateSignature, type webhook } from "@line/bot-sdk";
import { env } from "@/lib/env";
import { handleEvent } from "@/lib/line";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!signature || !validateSignature(body, env.LINE_CHANNEL_SECRET, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const { events = [] } = JSON.parse(body) as { events?: webhook.Event[] };

  after(async () => {
    const results = await Promise.allSettled(events.map(handleEvent));
    results.forEach((result) => {
      if (result.status === "rejected") console.error(result.reason);
    });
  });

  return NextResponse.json({ ok: true });
}
