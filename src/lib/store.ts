import { randomUUID } from "node:crypto";
import { getRedis } from "./redis";
import type { ChatMessage, ChatUser, ReplyMode } from "@/types/chat";

const MAX_USERS = 50;
const MAX_MESSAGES_KEPT = 500;
const MAX_MESSAGES_RETURNED = 100;
const AI_REPLIES_PER_USER_PER_HOUR = 30;
const AI_REPLIES_PER_DAY = 500;
const HOUR_MS = 60 * 60 * 1000;

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
  const pipeline = getRedis().pipeline();
  pipeline.hset(`user:${userId}`, { displayName, pictureUrl: pictureUrl ?? "" });
  pipeline.zadd("users", { nx: true }, { score: seenAt, member: userId });
  await pipeline.exec();
}

export async function addMessage(message: ChatMessage): Promise<void> {
  const { userId } = message;
  const pipeline = getRedis().pipeline();
  pipeline.rpush(`messages:${userId}`, message);
  pipeline.ltrim(`messages:${userId}`, -MAX_MESSAGES_KEPT, -1);
  if (message.sender !== "system") {
    pipeline.hset(`user:${userId}`, {
      lastMessage: message.text,
      lastMessageAt: message.timestamp,
    });
    pipeline.zadd("users", { score: message.timestamp, member: userId });
  }
  await pipeline.exec();
}

export async function addSystemNote(userId: string, text: string): Promise<void> {
  await addMessage({
    id: randomUUID(),
    userId,
    sender: "system",
    type: "system",
    text,
    timestamp: Date.now(),
  });
}

export async function userExists(userId: string): Promise<boolean> {
  return (await getRedis().zscore("users", userId)) !== null;
}

function toMode(value: unknown): ReplyMode {
  return value === "ai" ? "ai" : "human";
}

export async function getMode(userId: string): Promise<ReplyMode> {
  return toMode(await getRedis().hget(`user:${userId}`, "mode"));
}

export async function setMode(userId: string, mode: ReplyMode): Promise<void> {
  await getRedis().hset(`user:${userId}`, { mode });
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
      mode: toMode(hash.mode),
    };
  });
}

export async function listMessages(
  userId: string,
  limit = MAX_MESSAGES_RETURNED,
): Promise<ChatMessage[]> {
  const messages = await getRedis().lrange<ChatMessage>(`messages:${userId}`, -limit, -1);
  return messages.map((message) => ({ ...message, text: String(message.text) }));
}

export async function allowAiReply(userId: string): Promise<boolean> {
  const now = Date.now();
  const userKey = `ai:user:${userId}:${Math.floor(now / HOUR_MS)}`;
  const globalKey = `ai:all:${Math.floor(now / (24 * HOUR_MS))}`;

  const pipeline = getRedis().pipeline();
  pipeline.incr(userKey);
  pipeline.expire(userKey, 60 * 60);
  pipeline.incr(globalKey);
  pipeline.expire(globalKey, 60 * 60 * 24);
  const [userCount, , globalCount] = await pipeline.exec<[number, number, number, number]>();

  return userCount <= AI_REPLIES_PER_USER_PER_HOUR && globalCount <= AI_REPLIES_PER_DAY;
}

export function fallbackName(userId: string): string {
  return `ไม่ทราบชื่อ (${userId.slice(-6)})`;
}
