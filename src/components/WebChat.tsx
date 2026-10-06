"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChatWindow } from "./ChatWindow";
import { ConversationList } from "./ConversationList";
import { fetcher, POLL_INTERVAL_MS } from "@/lib/fetcher";
import type { ChatUser } from "@/types/chat";

interface Props {
  bot: { displayName: string; basicId: string } | null;
}

export function WebChat({ bot }: Props) {
  const { data: users, error, mutate } = useSWR<ChatUser[]>("/api/conversations", fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users?.find((user) => user.userId === selectedId) ?? null;
  const addFriendUrl = bot ? `https://line.me/R/ti/p/${encodeURIComponent(bot.basicId)}` : null;

  return (
    <main className="flex h-dvh">
      <aside
        className={`w-full flex-col border-r border-neutral-200 bg-white md:flex md:w-80 md:shrink-0 ${
          selected ? "hidden" : "flex"
        }`}
      >
        <header className="border-b border-neutral-200 px-4 py-3">
          <h1 className="font-semibold">{bot?.displayName ?? "LINE OA Webchat"}</h1>
          <p className="text-xs text-neutral-400">
            {bot ? `${bot.basicId} · ` : ""}
            {users ? `${users.length} คน` : "กำลังโหลด…"}
          </p>
        </header>

        {error && !users && (
          <p role="alert" className="p-4 text-sm text-red-600">
            {error.message}
          </p>
        )}
        {users?.length === 0 && (
          <div className="p-4 text-sm text-neutral-500">
            <p className="font-medium text-neutral-700">ยังไม่มีผู้ใช้ทักเข้ามา</p>
            <p className="mt-1">เพิ่ม OA เป็นเพื่อนใน LINE แล้วส่งข้อความ รายชื่อจะขึ้นที่นี่เอง</p>
            {addFriendUrl && (
              <a
                href={addFriendUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-lg bg-line px-3 py-1.5 font-medium text-white hover:bg-line-dark"
              >
                เพิ่มเพื่อน {bot?.basicId}
              </a>
            )}
          </div>
        )}
        {users && users.length > 0 && (
          <ConversationList users={users} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </aside>

      {selected ? (
        <ChatWindow
          key={selected.userId}
          user={selected}
          onBack={() => setSelectedId(null)}
          onSent={() => void mutate()}
        />
      ) : (
        <section className="hidden flex-1 items-center justify-center text-neutral-400 md:flex">
          เลือกผู้ใช้ทางซ้ายเพื่อดูและตอบข้อความ
        </section>
      )}
    </main>
  );
}
