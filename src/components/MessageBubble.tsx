import { formatTime } from "@/lib/fetcher";
import type { ChatMessage } from "@/types/chat";

const BUBBLE = "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap";

export function MessageBubble({ message, pending }: { message: ChatMessage; pending: boolean }) {
  const time = formatTime(message.timestamp);

  if (message.sender === "system") {
    return (
      <p className="mx-auto w-fit rounded-full bg-neutral-200/80 px-3 py-0.5 text-xs text-neutral-600">
        {message.text} · {time}
      </p>
    );
  }

  if (message.sender === "customer") {
    return (
      <div className="flex items-end gap-2">
        <p className={`${BUBBLE} bg-white ring-1 ring-black/5`}>{message.text}</p>
        <span className="shrink-0 text-xs text-neutral-400">{time}</span>
      </div>
    );
  }

  const fromAi = message.sender === "ai";
  return (
    <div className="flex flex-row-reverse items-end gap-2">
      <p
        className={`${BUBBLE} ${fromAi ? "bg-brand-soft text-ink" : "bg-ink text-white"} ${
          pending ? "opacity-60" : ""
        }`}
      >
        {message.text}
      </p>
      <span className={`shrink-0 text-xs ${fromAi ? "text-brand-dark" : "text-neutral-400"}`}>
        {pending ? "กำลังส่ง…" : fromAi ? `Zwiz AI · ${time}` : time}
      </span>
    </div>
  );
}
