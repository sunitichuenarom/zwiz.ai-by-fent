"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";

export const CONVERSATIONS_KEY = "/api/conversations";

export function messagesKey(userId: string): string {
  return `${CONVERSATIONS_KEY}/${encodeURIComponent(userId)}/messages`;
}

export function useLiveUpdates(): void {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      const { userId } = JSON.parse(event.data) as { userId: string };
      void mutate(CONVERSATIONS_KEY);
      void mutate(messagesKey(userId));
    };
    return () => source.close();
  }, [mutate]);
}
