import { getRedis } from "./redis";
import type { ChatMessage, ChatUser } from "@/types/chat";

const MAX_USERS = 50;
const MAX_MESSAGES_KEPT = 500;
const MAX_MESSAGES_RETURNED = 100;

export async function isDuplicateEvent(eventId: string): Promise<boolean> {
  const result = await getRedis().set(`evt:${eventId}`, 1, {
    nx: true,
    ex: 60 * 60 * 24,
  });
  return result === null;
}

export async function upsertUser(profile: {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  seenAt: number;
}): Promise<void> {
  const { userId, displayName, pictureUrl, seenAt } = profile;
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.hset(`user:${userId}`, { displayName, pictureUrl: pictureUrl ?? "" });
  pipeline.zadd("users", { nx: true }, { score: seenAt, member: userId });
  await pipeline.exec();
}

export async function addMessage(message: ChatMessage): Promise<void> {
  const { userId } = message;
  const pipeline = getRedis().pipeline();
  pipeline.rpush(`messages:${userId}`, message);
  pipeline.ltrim(`messages:${userId}`, -MAX_MESSAGES_KEPT, -1);
  pipeline.hset(`user:${userId}`, {
    lastMessage: message.text,
    lastMessageAt: message.timestamp,
  });
  pipeline.zadd("users", { score: message.timestamp, member: userId });
  await pipeline.exec();
}

export async function userExists(userId: string): Promise<boolean> {
  return (await getRedis().zscore("users", userId)) !== null;
}

export async function listUsers(): Promise<ChatUser[]> {
  const redis = getRedis();
  const userIds = await redis.zrange<string[]>("users", 0, MAX_USERS - 1, {
    rev: true,
  });
  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => pipeline.hgetall(`user:${userId}`));
  const hashes = await pipeline.exec<(Record<string, unknown> | null)[]>();

  return userIds.map((userId, index) => {
    const hash = hashes[index] ?? {};
    return {
      userId,
      displayName: String(hash.displayName ?? "") || fallbackName(userId),
      pictureUrl: hash.pictureUrl ? String(hash.pictureUrl) : undefined,
      lastMessage: String(hash.lastMessage ?? ""),
      lastMessageAt: Number(hash.lastMessageAt ?? 0),
    };
  });
}

export async function listMessages(userId: string): Promise<ChatMessage[]> {
  const messages = await getRedis().lrange<ChatMessage>(
    `messages:${userId}`,
    -MAX_MESSAGES_RETURNED,
    -1,
  );
  return messages.map((message) => ({ ...message, text: String(message.text) }));
}

export function fallbackName(userId: string): string {
  return `ไม่ทราบชื่อ (${userId.slice(-6)})`;
}
