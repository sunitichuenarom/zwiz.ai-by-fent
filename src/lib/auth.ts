import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "webchat_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function sessionToken(passcode: string): string {
  return createHmac("sha256", passcode).update(COOKIE_NAME).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(sessionToken(a));
  const right = Buffer.from(sessionToken(b));
  return timingSafeEqual(left, right);
}

export function isPasscodeEnabled(): boolean {
  return env.APP_PASSCODE !== undefined;
}

export async function isAuthorized(): Promise<boolean> {
  const passcode = env.APP_PASSCODE;
  if (!passcode) return true;
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  return cookie === sessionToken(passcode);
}

export async function signIn(input: string): Promise<boolean> {
  const passcode = env.APP_PASSCODE;
  if (!passcode) return true;
  if (!safeEqual(input, passcode)) return false;

  (await cookies()).set(COOKIE_NAME, sessionToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  });
  return true;
}

export function unauthorized(): Response {
  return Response.json({ error: "ต้องกรอกรหัสผ่านก่อน" }, { status: 401 });
}
