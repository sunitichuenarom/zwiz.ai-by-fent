import { isAuthorized, unauthorized } from "@/lib/auth";
import { subscribeToChanges } from "@/lib/store";

export const maxDuration = 300;

const HEARTBEAT_MS = 20_000;

export async function GET(req: Request) {
  if (!(await isAuthorized())) return unauthorized();

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const unsubscribe = subscribeToChanges((userId) =>
        send(`data: ${JSON.stringify({ userId })}\n\n`),
      );
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void unsubscribe().catch(() => {});
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      send("retry: 2000\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
