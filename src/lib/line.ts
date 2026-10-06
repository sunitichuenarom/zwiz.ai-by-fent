import { randomUUID } from "node:crypto";
import { HTTPFetchError, messagingApi, type webhook } from "@line/bot-sdk";
import { ASK_AI, TALK_TO_ADMIN, generateAiReply, isAiConfigured } from "./ai";
import { env } from "./env";
import {
  addMessage,
  addSystemNote,
  allowAiReply,
  fallbackName,
  getMode,
  isDuplicateEvent,
  listMessages,
  markUnread,
  setMode,
  upsertUser,
} from "./store";
import type { ChatMessage, ReplyMode } from "@/types/chat";

const AI_HISTORY_SIZE = 12;

const GREETING = `สวัสดีค่ะ ขอบคุณที่เพิ่มเพื่อนกับ ZWIZ.AI (เดโม) นะคะ
พิมพ์ข้อความทิ้งไว้ได้เลย แอดมินจะเข้ามาตอบค่ะ`;
const GREETING_AI_HINT = `หรือกด “${ASK_AI}” เพื่อสอบถามบริการของ ZWIZ.AI ได้ทันที`;
const AI_INTRO = `Zwiz AI พร้อมตอบแล้วค่ะ ถามเรื่องบริการ ฟีเจอร์ ราคาเริ่มต้น หรือโปรแกรมพาร์ทเนอร์ของ ZWIZ.AI ได้เลย
หากต้องการคุยกับคน กด “${TALK_TO_ADMIN}” ได้ทุกเมื่อค่ะ`;
const HANDOFF_ACK = "รับทราบค่ะ ส่งต่อให้แอดมินแล้ว รอสักครู่นะคะ";
const TEXT_ONLY = "ตอนนี้ Zwiz AI อ่านได้เฉพาะข้อความตัวอักษรค่ะ รบกวนพิมพ์คำถามเข้ามาได้เลย";
const AI_FAILED = "ขออภัยค่ะ ตอนนี้ Zwiz AI ตอบไม่ได้ ส่งต่อให้แอดมินแล้ว รอสักครู่นะคะ";
const AI_UNAVAILABLE = "ขออภัยค่ะ ตอนนี้ระบบ AI ยังไม่เปิดใช้งาน แอดมินจะเข้ามาตอบแทนนะคะ";

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

type Intent = "ai_on" | "ai_off" | null;

export function detectIntent(text: string): Intent {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized === ASK_AI.toLowerCase().replace(/\s+/g, "")) return "ai_on";
  if (normalized === TALK_TO_ADMIN) return "ai_off";
  return null;
}

function textMessage(text: string, quickReplies: string[]): messagingApi.TextMessage {
  if (quickReplies.length === 0) return { type: "text", text };
  return {
    type: "text",
    text,
    quickReply: {
      items: quickReplies.map((label) => ({
        type: "action",
        action: { type: "message", label, text: label },
      })),
    },
  };
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

async function replyAsAi(
  userId: string,
  replyToken: string,
  text: string,
  quickReplies: string[],
): Promise<void> {
  try {
    const response = await getLineClient().replyMessage({
      replyToken,
      messages: [textMessage(text, quickReplies)],
    });
    await addMessage({
      id: response.sentMessages?.[0]?.id ?? randomUUID(),
      userId,
      sender: "ai",
      type: "text",
      text,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("replyMessage failed", userId, describeError(error));
  }
}

async function answerWithAi(userId: string, replyToken: string): Promise<void> {
  let answer: string;
  try {
    if (!(await allowAiReply(userId))) throw new Error("AI reply limit reached");
    void getLineClient()
      .showLoadingAnimation({ chatId: userId, loadingSeconds: 30 })
      .catch(() => {});
    answer = await generateAiReply(await listMessages(userId, AI_HISTORY_SIZE));
  } catch (error) {
    console.error("AI reply failed", userId, describeError(error));
    await setMode(userId, "human");
    await markUnread(userId);
    await addSystemNote(userId, "Zwiz AI ตอบไม่ได้ ส่งต่อให้แอดมิน");
    await replyAsAi(userId, replyToken, AI_FAILED, []);
    return;
  }
  if ((await getMode(userId)) !== "ai") return;
  await replyAsAi(userId, replyToken, answer, [TALK_TO_ADMIN]);
}

async function respond(
  userId: string,
  replyToken: string,
  message: webhook.MessageContent,
  intent: Intent,
  mode: ReplyMode,
): Promise<void> {
  if (intent === "ai_on") {
    if (!isAiConfigured()) {
      await replyAsAi(userId, replyToken, AI_UNAVAILABLE, []);
      return;
    }
    await setMode(userId, "ai");
    await addSystemNote(userId, `ลูกค้ากด “${ASK_AI}”`);
    await replyAsAi(userId, replyToken, AI_INTRO, [TALK_TO_ADMIN]);
    return;
  }
  if (intent === "ai_off") {
    await setMode(userId, "human");
    await addSystemNote(userId, `ลูกค้ากด “${TALK_TO_ADMIN}”`);
    await replyAsAi(userId, replyToken, HANDOFF_ACK, isAiConfigured() ? [ASK_AI] : []);
    return;
  }

  if (mode !== "ai") return;
  if (message.type !== "text") {
    await replyAsAi(userId, replyToken, TEXT_ONLY, [TALK_TO_ADMIN]);
    return;
  }
  await answerWithAi(userId, replyToken);
}

export async function handleEvent(event: webhook.Event): Promise<void> {
  const source = event.source;
  if (source?.type !== "user" || !source.userId) return;
  if (event.type !== "message" && event.type !== "follow") return;
  if (await isDuplicateEvent(event.webhookEventId)) return;

  const userId = source.userId;
  const profile = await fetchProfile(userId);
  await upsertUser({ userId, ...profile, seenAt: event.timestamp });

  if (event.type === "follow") {
    const withAi = isAiConfigured();
    await replyAsAi(
      userId,
      event.replyToken,
      withAi ? `${GREETING} ${GREETING_AI_HINT}` : GREETING,
      withAi ? [ASK_AI] : [],
    );
    return;
  }

  const mode = await getMode(userId);
  const intent = event.message.type === "text" ? detectIntent(event.message.text) : null;
  const needsAdmin = intent === "ai_off" || (mode === "human" && intent !== "ai_on");
  await addMessage(
    {
      id: event.message.id,
      userId,
      sender: "customer",
      type: event.message.type,
      text: messageToText(event.message),
      timestamp: event.timestamp,
    },
    { unread: needsAdmin },
  );
  if (event.replyToken) await respond(userId, event.replyToken, event.message, intent, mode);
}

export async function pushText(userId: string, text: string): Promise<ChatMessage> {
  const response = await getLineClient().pushMessage(
    { to: userId, messages: [textMessage(text, isAiConfigured() ? [ASK_AI] : [])] },
    randomUUID(),
  );
  return {
    id: response.sentMessages?.[0]?.id ?? randomUUID(),
    userId,
    sender: "admin",
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
