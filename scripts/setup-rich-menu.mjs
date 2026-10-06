import { readFile } from "node:fs/promises";
import { messagingApi } from "@line/bot-sdk";

const MENU_NAME = "zwiz-chat-switch";
const WIDTH = 1200;
const HEIGHT = 405;
const ASK_AI = "ถาม AI";
const TALK_TO_ADMIN = "คุยกับแอดมิน";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!channelAccessToken) {
  console.error("ไม่พบ LINE_CHANNEL_ACCESS_TOKEN (ใส่ใน .env.local ก่อน)");
  process.exit(1);
}

const client = new messagingApi.MessagingApiClient({ channelAccessToken });
const blobClient = new messagingApi.MessagingApiBlobClient({ channelAccessToken });

const half = WIDTH / 2;
const button = (x, text) => ({
  bounds: { x, y: 0, width: half, height: HEIGHT },
  action: { type: "message", label: text, text },
});

const { richmenus } = await client.getRichMenuList();
for (const menu of richmenus.filter((item) => item.name === MENU_NAME)) {
  await client.deleteRichMenu(menu.richMenuId);
  console.log("ลบเมนูเดิม:", menu.richMenuId);
}

const { richMenuId } = await client.createRichMenu({
  size: { width: WIDTH, height: HEIGHT },
  selected: true,
  name: MENU_NAME,
  chatBarText: "เลือกผู้ตอบ",
  areas: [button(0, ASK_AI), button(half, TALK_TO_ADMIN)],
});

const image = await readFile(new URL("./rich-menu.png", import.meta.url));
await blobClient.setRichMenuImage(richMenuId, new Blob([image], { type: "image/png" }));
await client.setDefaultRichMenu(richMenuId);

console.log("ตั้งเป็น rich menu เริ่มต้นของ OA แล้ว:", richMenuId);
