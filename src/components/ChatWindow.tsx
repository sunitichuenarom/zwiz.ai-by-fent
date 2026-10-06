"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { fetcher, POLL_INTERVAL_MS } from "@/lib/fetcher";
import type { ChatMessage, ChatUser } from "@/types/chat";

const PENDING_PREFIX = "pending-";

interface Props {
  user: ChatUser;
  onBack: () => void;
  onSent: () => void;
}

export function ChatWindow({ user, onBack, onSent }: Props) {
  const url = `/api/conversations/${encodeURIComponent(user.userId)}/messages`;
  const { data: messages, error: loadError, mutate } = useSWR<ChatMessage[]>(url, fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
  });
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessageId = messages?.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lastMessageId]);

  async function send(text: string): Promise<boolean> {
    setSendError("");
    const optimistic: ChatMessage = {
      id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      userId: user.userId,
      direction: "out",
      type: "text",
      text,
      timestamp: Date.now(),
    };
    try {
      await mutate(
        async (current = []) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          const data = (await res.json().catch(() => null)) as
            | (ChatMessage & { error?: string })
            | null;
          if (!res.ok || !data) {
            throw new Error(data?.error ?? `ส่งไม่สำเร็จ (${res.status})`);
          }
          return [...current, data];
        },
        {
          optimisticData: (current = []) => [...current, optimistic],
          rollbackOnError: true,
          revalidate: false,
        },
      );
      onSent();
      return true;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "ส่งไม่สำเร็จ");
      return false;
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="กลับไปรายชื่อ"
          className="-ml-2 rounded-lg px-2 py-1 text-xl text-neutral-500 hover:bg-neutral-100 md:hidden"
        >
          ←
        </button>
        <Avatar name={user.displayName} pictureUrl={user.pictureUrl} />
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{user.displayName}</h2>
          <p className="truncate text-xs text-neutral-400">{user.userId}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {!messages && !loadError && (
          <p className="text-center text-sm text-neutral-400">กำลังโหลด…</p>
        )}
        {loadError && !messages && (
          <p role="alert" className="text-center text-sm text-red-600">
            {loadError.message}
          </p>
        )}
        {messages?.length === 0 && (
          <p className="text-center text-sm text-neutral-400">ยังไม่มีข้อความ</p>
        )}
        {messages?.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            pending={message.id.startsWith(PENDING_PREFIX)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {sendError}
        </p>
      )}
      <MessageInput onSend={send} />
    </section>
  );
}
