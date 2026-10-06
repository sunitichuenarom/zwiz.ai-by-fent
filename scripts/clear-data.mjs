import { Redis } from "@upstash/redis";

const PREFIX = "zwiz-chat:";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("ไม่พบค่าเชื่อมต่อ Redis (ใส่ใน .env.local ก่อน)");
  process.exit(1);
}

const redis = new Redis({ url, token });
const dryRun = process.argv.includes("--dry-run");

const keys = [];
let cursor = "0";
do {
  const [next, batch] = await redis.scan(cursor, { match: `${PREFIX}*`, count: 200 });
  cursor = String(next);
  keys.push(...batch);
} while (cursor !== "0");

if (keys.length === 0) {
  console.log("ไม่มีข้อมูลของ Zwiz Chat ให้ลบ");
} else if (dryRun) {
  console.log(`จะลบ ${keys.length} key:`);
  keys.forEach((key) => console.log(" ", key));
} else {
  for (let index = 0; index < keys.length; index += 100) {
    await redis.del(...keys.slice(index, index + 100));
  }
  console.log(`ลบแล้ว ${keys.length} key ที่ขึ้นต้นด้วย ${PREFIX}`);
}
