"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { fetcher, FALLBACK_POLL_MS } from "@/lib/fetcher";
import { CONVERSATIONS_KEY, messagesKey } from "@/lib/useLiveUpdates";
import type { ChatMessage, ChatUser, ReplyMode } from "@/types/chat";

const PENDING_PREFIX = "pending-";

interface Props {
  user: ChatUser;
  onBack: () => void;
  onChanged: () => void;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? `ทำรายการไม่สำเร็จ (${res.status})`);
  return data;
}

export function ChatWindow({ user, onBack, onChanged }: Props) {
  const base = `${CONVERSATIONS_KEY}/${encodeURIComponent(user.userId)}`;
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data: messages, error: loadError, mutate } = useSWR<ChatMessage[]>(
    messagesKey(user.userId),
    fetcher,
    { refreshInterval: FALLBACK_POLL_MS },
  );
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiMode = user.mode === "ai";

  const lastMessageId = messages?.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lastMessageId]);

  const unread = user.unread;
  useEffect(() => {
    if (unread === 0) return;
    const markRead = () => {
      if (document.visibilityState !== "visible") return;
      void fetch(`${base}/read`, { method: "POST" }).then(() => mutateGlobal(CONVERSATIONS_KEY));
    };
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [unread, base, mutateGlobal]);

  async function send(text: string): Promise<boolean> {
    setError("");
    const optimistic: ChatMessage = {
      id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      userId: user.userId,
      sender: "admin",
      type: "text",
      text,
      timestamp: Date.now(),
    };
    try {
      await mutate(
        async (current = []) => [
          ...current,
          await postJson<ChatMessage>(`${base}/messages`, { text }),
        ],
        {
          optimisticData: (current = []) => [...current, optimistic],
          rollbackOnError: true,
          revalidate: true,
        },
      );
      onChanged();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งไม่สำเร็จ");
      return false;
    }
  }

  async function switchMode(mode: ReplyMode) {
    setError("");
    setSwitching(true);
    try {
      await postJson(`${base}/mode`, { mode });
      await mutateGlobal(CONVERSATIONS_KEY);
      onChanged();
      void mutate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สลับโหมดไม่สำเร็จ");
    }
    setSwitching(false);
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="กลับไปรายชื่อ"
          className="-ml-2 rounded-lg px-2 py-1 text-xl text-neutral-500 hover:bg-neutral-100 md:hidden"
        >
          ←
        </button>
        <Avatar name={user.displayName} pictureUrl={user.pictureUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold">{user.displayName}</h2>
          <p className={`truncate text-xs ${aiMode ? "text-brand-dark" : "text-neutral-400"}`}>
            {aiMode ? "LINE · Zwiz AI กำลังตอบอัตโนมัติ" : "LINE · แอดมินเป็นผู้ตอบ"}
          </p>
        </div>
        <button
          type="button"
          disabled={switching}
          aria-busy={switching}
          onClick={() => void switchMode(aiMode ? "human" : "ai")}
          className={`flex shrink-0 items-center gap-2 rounded-[10px] border px-3.5 py-1.5 text-[13px] font-medium disabled:cursor-wait disabled:opacity-70 ${
            aiMode
              ? "border-ink text-ink hover:bg-neutral-100"
              : "border-neutral-300 text-neutral-600 hover:border-brand hover:text-brand-dark"
          }`}
        >
          {switching && (
            <span
              aria-hidden
              className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {switching ? "กำลังสลับ…" : aiMode ? "รับช่วงต่อจาก AI" : "ให้ Zwiz AI ตอบ"}
        </button>
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

      {error && (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}
      {aiMode && (
        <p className="bg-brand-soft/60 px-4 py-2 text-[13px] text-brand-dark">
          Zwiz AI กำลังตอบลูกค้ารายนี้ · ส่งข้อความเพื่อรับช่วงต่อ
        </p>
      )}
      <MessageInput onSend={send} />
    </section>
  );
}
