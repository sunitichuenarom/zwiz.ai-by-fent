"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChatWindow } from "./ChatWindow";
import { ConversationList } from "./ConversationList";
import { Logo } from "./Logo";
import { UserDetails } from "./UserDetails";
import { DEMO_NOTICE, fetcher, POLL_INTERVAL_MS } from "@/lib/fetcher";
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
    <main className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink-soft bg-ink px-5 text-white">
        <div className="flex items-center gap-2.5">
          <Logo />
          <h1 className="font-brand text-lg font-semibold">Zwiz Chat</h1>
          <span title={DEMO_NOTICE} className="rounded bg-ink-soft px-1.5 py-0.5 text-[11px] text-neutral-300">
            เดโม
          </span>
        </div>
        {bot && (
          <p className="truncate text-[13px] text-neutral-300">
            {bot.displayName} · {bot.basicId}
          </p>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`w-full flex-col bg-ink text-white md:flex md:w-80 md:shrink-0 ${
            selected ? "hidden" : "flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink-soft px-4 py-3.5">
            <h2 className="text-[15px] font-semibold">การสนทนา</h2>
            <span className="text-xs text-neutral-500">
              {users ? `${users.length} คน` : "กำลังโหลด…"}
            </span>
          </div>

          {error && !users && (
            <p role="alert" className="p-4 text-sm text-red-400">
              {error.message}
            </p>
          )}
          {users?.length === 0 && (
            <div className="p-4 text-sm text-neutral-400">
              <p className="font-medium text-white">ยังไม่มีผู้ใช้ทักเข้ามา</p>
              <p className="mt-1">เพิ่ม OA เป็นเพื่อนใน LINE แล้วส่งข้อความ รายชื่อจะขึ้นที่นี่เอง</p>
              {addFriendUrl && (
                <a
                  href={addFriendUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
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
          <>
            <ChatWindow
              key={selected.userId}
              user={selected}
              onBack={() => setSelectedId(null)}
              onChanged={() => void mutate()}
            />
            <UserDetails user={selected} />
          </>
        ) : (
          <section className="hidden flex-1 items-center justify-center text-neutral-400 md:flex">
            เลือกผู้ใช้ทางซ้ายเพื่อดูและตอบข้อความ
          </section>
        )}
      </div>
    </main>
  );
}
