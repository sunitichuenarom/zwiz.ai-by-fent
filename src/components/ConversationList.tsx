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
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${
                selected ? "bg-line/10 hover:bg-line/10" : ""
              }`}
            >
              <Avatar name={user.displayName} pictureUrl={user.pictureUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{user.displayName}</span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatTime(user.lastMessageAt)}
                  </span>
                </div>
                <p className="truncate text-sm text-neutral-500">
                  {user.lastMessage || "เพิ่มเพื่อนแล้ว ยังไม่มีข้อความ"}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
