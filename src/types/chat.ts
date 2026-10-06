export type Direction = "in" | "out";

export interface ChatUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage: string;
  lastMessageAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  direction: Direction;
  type: string;
  text: string;
  timestamp: number;
}
