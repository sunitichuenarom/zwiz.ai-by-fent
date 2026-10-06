import { formatTime } from "@/lib/fetcher";
import type { ChatMessage } from "@/types/chat";

export function MessageBubble({ message, pending }: { message: ChatMessage; pending: boolean }) {
  const outgoing = message.direction === "out";
  return (
    <div className={`flex items-end gap-2 ${outgoing ? "flex-row-reverse" : ""}`}>
      <p
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 break-words whitespace-pre-wrap ${
          outgoing ? "bg-line text-white" : "bg-white ring-1 ring-black/5"
        } ${pending ? "opacity-60" : ""}`}
      >
        {message.text}
      </p>
      <span className="shrink-0 text-xs text-neutral-400">
        {pending ? "กำลังส่ง…" : formatTime(message.timestamp)}
      </span>
    </div>
  );
}
