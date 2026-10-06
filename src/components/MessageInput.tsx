"use client";

import { useState } from "react";

interface Props {
  onSend: (text: string) => Promise<boolean>;
}

export function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const canSend = text.trim().length > 0 && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    const sent = await onSend(text.trim());
    if (sent) setText("");
    setSending(false);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
      className="flex items-end gap-2 border-t border-neutral-200 bg-white p-3"
    >
      <textarea
        aria-label="ข้อความ"
        rows={1}
        value={text}
        disabled={sending}
        maxLength={5000}
        placeholder="พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void send();
          }
        }}
        className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-line focus:ring-2 focus:ring-line/30 disabled:bg-neutral-50"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="h-10 rounded-xl bg-line px-5 font-medium text-white hover:bg-line-dark disabled:opacity-50"
      >
        {sending ? "กำลังส่ง…" : "ส่ง"}
      </button>
    </form>
  );
}
