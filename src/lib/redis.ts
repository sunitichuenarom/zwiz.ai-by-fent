import { Redis } from "@upstash/redis";

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "Missing Redis environment variables (KV_REST_API_URL / KV_REST_API_TOKEN)",
      );
    }
    client = new Redis({ url, token });
  }
  return client;
}
