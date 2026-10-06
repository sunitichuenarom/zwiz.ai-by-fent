export type Sender = "customer" | "admin" | "ai" | "system";

export type ReplyMode = "human" | "ai";

export interface ChatUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage: string;
  lastMessageAt: number;
  mode: ReplyMode;
  unread: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: Sender;
  type: string;
  text: string;
  timestamp: number;
}
