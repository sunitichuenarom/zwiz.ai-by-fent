import { randomUUID } from "node:crypto";
import { HTTPFetchError, messagingApi, type webhook } from "@line/bot-sdk";
import { env } from "./env";
import {
  addMessage,
  fallbackName,
  isDuplicateEvent,
  upsertUser,
} from "./store";
import type { ChatMessage } from "@/types/chat";

let client: messagingApi.MessagingApiClient | undefined;

function getLineClient(): messagingApi.MessagingApiClient {
  client ??= new messagingApi.MessagingApiClient({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  });
  return client;
}

const PLACEHOLDERS: Record<string, string> = {
  image: "[รูปภาพ]",
  sticker: "[สติกเกอร์]",
  video: "[วิดีโอ]",
  audio: "[เสียง]",
  file: "[ไฟล์]",
  location: "[ตำแหน่ง]",
};

export function messageToText(message: webhook.MessageContent): string {
  if (message.type === "text") return message.text;
  return PLACEHOLDERS[message.type] ?? `[${message.type}]`;
}

async function fetchProfile(userId: string) {
  try {
    const profile = await getLineClient().getProfile(userId);
    return { displayName: profile.displayName, pictureUrl: profile.pictureUrl };
  } catch (error) {
    console.error("getProfile failed", userId, describeError(error));
    return { displayName: fallbackName(userId), pictureUrl: undefined };
  }
}

export async function handleEvent(event: webhook.Event): Promise<void> {
  const source = event.source;
  if (source?.type !== "user" || !source.userId) return;
  if (event.type !== "message" && event.type !== "follow") return;
  if (await isDuplicateEvent(event.webhookEventId)) return;

  const userId = source.userId;
  const profile = await fetchProfile(userId);
  await upsertUser({ userId, ...profile, seenAt: event.timestamp });

  if (event.type === "message") {
    await addMessage({
      id: event.message.id,
      userId,
      direction: "in",
      type: event.message.type,
      text: messageToText(event.message),
      timestamp: event.timestamp,
    });
  }
}

export async function pushText(userId: string, text: string): Promise<ChatMessage> {
  const response = await getLineClient().pushMessage(
    { to: userId, messages: [{ type: "text", text }] },
    randomUUID(),
  );
  return {
    id: response.sentMessages?.[0]?.id ?? randomUUID(),
    userId,
    direction: "out",
    type: "text",
    text,
    timestamp: Date.now(),
  };
}

export async function getBotInfo() {
  try {
    const { displayName, basicId } = await getLineClient().getBotInfo();
    return { displayName, basicId };
  } catch (error) {
    console.error("getBotInfo failed", describeError(error));
    return null;
  }
}

function describeError(error: unknown): string {
  if (error instanceof HTTPFetchError) return `${error.status} ${error.body}`;
  return error instanceof Error ? error.message : String(error);
}

export function pushErrorMessage(error: unknown): string {
  if (!(error instanceof HTTPFetchError)) {
    return "ส่งไม่สำเร็จ: เชื่อมต่อ LINE ไม่ได้";
  }
  switch (error.status) {
    case 400:
      return "ส่งไม่สำเร็จ: LINE ปฏิเสธคำขอ (userId หรือข้อความไม่ถูกต้อง)";
    case 401:
      return "ส่งไม่สำเร็จ: Channel access token ไม่ถูกต้องหรือหมดอายุ";
    case 429:
      return error.body.includes("monthly limit")
        ? "ส่งไม่สำเร็จ: โควตาข้อความของ OA เดือนนี้เต็มแล้ว"
        : "ส่งไม่สำเร็จ: ส่งถี่เกินไป ลองใหม่อีกครั้ง";
    default:
      return `ส่งไม่สำเร็จ: LINE ตอบ ${error.status}`;
  }
}
