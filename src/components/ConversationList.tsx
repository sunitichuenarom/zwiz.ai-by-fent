import { Avatar } from "./Avatar";
import { formatTime } from "@/lib/fetcher";
import type { ChatUser } from "@/types/chat";

interface Props {
  users: ChatUser[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
}

export function ConversationList({ users, selectedId, onSelect }: Props) {
  return (
    <ul className="flex-1 overflow-y-auto">
      {users.map((user) => {
        const selected = user.userId === selectedId;
        return (
          <li key={user.userId}>
            <button
              type="button"
              onClick={() => onSelect(user.userId)}
              aria-current={selected}
              className={`flex w-full items-center gap-3 border-l-[3px] py-3 pr-4 pl-[13px] text-left ${
                selected
                  ? "border-brand bg-ink-soft"
                  : "border-transparent hover:bg-ink-soft/50"
              }`}
            >
              <Avatar name={user.displayName} pictureUrl={user.pictureUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">
                    {user.displayName}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {formatTime(user.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-neutral-400">
                    {user.lastMessage || "เพิ่มเพื่อนแล้ว ยังไม่มีข้อความ"}
                  </p>
                  {user.mode === "ai" && (
                    <span
                      title="Zwiz AI กำลังตอบลูกค้ารายนี้"
                      className="shrink-0 rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white"
                    >
                      AI
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
