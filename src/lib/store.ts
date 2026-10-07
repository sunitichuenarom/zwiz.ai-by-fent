import { randomUUID } from "node:crypto";
import { decrypt, encrypt } from "./crypto";
import { getRedis } from "./redis";
import type { ChatMessage, ChatUser, ReplyMode } from "@/types/chat";

const NAMESPACE = "zwiz-chat";
const keys = {
  users: `${NAMESPACE}:users`,
  user: (userId: string) => `${NAMESPACE}:user:${userId}`,
  messages: (userId: string) => `${NAMESPACE}:messages:${userId}`,
  event: (eventId: string) => `${NAMESPACE}:evt:${eventId}`,
  aiUser: (userId: string, hour: number) => `${NAMESPACE}:ai:user:${userId}:${hour}`,
  aiAll: (day: number) => `${NAMESPACE}:ai:all:${day}`,
  login: (ip: string) => `${NAMESPACE}:login:${ip}`,
  events: `${NAMESPACE}:events`,
};

const MAX_USERS = 50;
const MAX_MESSAGES_KEPT = 500;
const MAX_MESSAGES_RETURNED = 100;
const AI_REPLIES_PER_USER_PER_HOUR = 30;
const AI_REPLIES_PER_DAY = 500;
const LOGIN_WINDOW_SECONDS = 10 * 60;
const HOUR_MS = 60 * 60 * 1000;

export async function isDuplicateEvent(eventId: string): Promise<boolean> {
  const result = await getRedis().set(keys.event(eventId), 1, {
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
  pipeline.hset(keys.user(userId), {
    displayName: encrypt(displayName),
    pictureUrl: encrypt(pictureUrl ?? ""),
  });
  pipeline.zadd(keys.users, { nx: true }, { score: seenAt, member: userId });
  pipeline.publish(keys.events, { userId });
  await pipeline.exec();
}

export async function addMessage(
  message: ChatMessage,
  options: { unread?: boolean } = {},
): Promise<void> {
  const { userId } = message;
  const pipeline = getRedis().pipeline();
  pipeline.rpush(keys.messages(userId), { ...message, text: encrypt(message.text) });
  pipeline.ltrim(keys.messages(userId), -MAX_MESSAGES_KEPT, -1);
  if (message.sender !== "system") {
    pipeline.hset(keys.user(userId), {
      lastMessage: encrypt(message.text),
      lastMessageAt: message.timestamp,
    });
    pipeline.zadd(keys.users, { score: message.timestamp, member: userId });
  }
  if (options.unread) pipeline.hincrby(keys.user(userId), "unread", 1);
  pipeline.publish(keys.events, { userId });
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
  return (await getRedis().zscore(keys.users, userId)) !== null;
}

function toMode(value: unknown): ReplyMode {
  return value === "ai" ? "ai" : "human";
}

export async function getMode(userId: string): Promise<ReplyMode> {
  return toMode(await getRedis().hget(keys.user(userId), "mode"));
}

export async function setMode(userId: string, mode: ReplyMode): Promise<void> {
  const pipeline = getRedis().pipeline();
  pipeline.hset(keys.user(userId), { mode });
  pipeline.publish(keys.events, { userId });
  await pipeline.exec();
}

export async function markUnread(userId: string): Promise<void> {
  const pipeline = getRedis().pipeline();
  pipeline.hincrby(keys.user(userId), "unread", 1);
  pipeline.publish(keys.events, { userId });
  await pipeline.exec();
}

export async function markRead(userId: string): Promise<void> {
  const pipeline = getRedis().pipeline();
  pipeline.hset(keys.user(userId), { unread: 0 });
  pipeline.publish(keys.events, { userId });
  await pipeline.exec();
}

export function subscribeToChanges(onChange: (userId: string) => void): () => Promise<void> {
  const subscriber = getRedis().subscribe<{ userId: string }>(keys.events);
  subscriber.on("message", ({ message }) => onChange(String(message.userId)));
  subscriber.on("error", (error) => console.error("redis subscribe failed", error));
  return () => subscriber.unsubscribe();
}

export async function listUsers(): Promise<ChatUser[]> {
  const redis = getRedis();
  const userIds = await redis.zrange<string[]>(keys.users, 0, MAX_USERS - 1, {
    rev: true,
  });
  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  userIds.forEach((userId) => pipeline.hgetall(keys.user(userId)));
  const hashes = await pipeline.exec<(Record<string, unknown> | null)[]>();

  return userIds.map((userId, index) => {
    const hash = hashes[index] ?? {};
    return {
      userId,
      displayName: decrypt(String(hash.displayName ?? "")) || fallbackName(userId),
      pictureUrl: hash.pictureUrl ? decrypt(String(hash.pictureUrl)) : undefined,
      lastMessage: decrypt(String(hash.lastMessage ?? "")),
      lastMessageAt: Number(hash.lastMessageAt ?? 0),
      mode: toMode(hash.mode),
      unread: Number(hash.unread ?? 0),
    };
  });
}

export async function listMessages(
  userId: string,
  limit = MAX_MESSAGES_RETURNED,
): Promise<ChatMessage[]> {
  const messages = await getRedis().lrange<ChatMessage>(keys.messages(userId), -limit, -1);
  return messages.map((message) => ({ ...message, text: decrypt(String(message.text)) }));
}

export async function allowAiReply(userId: string): Promise<boolean> {
  const now = Date.now();
  const userKey = keys.aiUser(userId, Math.floor(now / HOUR_MS));
  const globalKey = keys.aiAll(Math.floor(now / (24 * HOUR_MS)));

  const pipeline = getRedis().pipeline();
  pipeline.incr(userKey);
  pipeline.expire(userKey, 60 * 60);
  pipeline.incr(globalKey);
  pipeline.expire(globalKey, 60 * 60 * 24);
  const [userCount, , globalCount] = await pipeline.exec<[number, number, number, number]>();

  return userCount <= AI_REPLIES_PER_USER_PER_HOUR && globalCount <= AI_REPLIES_PER_DAY;
}

export async function countLoginAttempt(ip: string): Promise<number> {
  const redis = getRedis();
  const count = await redis.incr(keys.login(ip));
  if (count === 1) await redis.expire(keys.login(ip), LOGIN_WINDOW_SECONDS);
  return count;
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await getRedis().del(keys.login(ip));
}

export function fallbackName(userId: string): string {
  return `ไม่ทราบชื่อ (${userId.slice(-6)})`;
}
