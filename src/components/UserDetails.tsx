import { Avatar } from "./Avatar";
import { DEMO_NOTICE, formatDateTime } from "@/lib/fetcher";
import type { ChatUser } from "@/types/chat";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-[13px] break-all">{children}</dd>
    </div>
  );
}

export function UserDetails({ user }: { user: ChatUser }) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-neutral-200 bg-white xl:flex">
      <h2 className="px-5 pt-4 text-[13px] font-semibold text-neutral-500">ข้อมูลผู้ใช้</h2>
      <div className="flex flex-col items-center gap-3 px-5 pt-5 pb-6">
        <Avatar name={user.displayName} pictureUrl={user.pictureUrl} size="lg" />
        <p className="text-center font-semibold">{user.displayName}</p>
      </div>
      <dl className="mx-5 space-y-4 border-t border-neutral-200 pt-4">
        <Field label="User ID">{user.userId}</Field>
        <Field label="ข้อความล่าสุด">{formatDateTime(user.lastMessageAt)}</Field>
        <Field label="ช่องทาง">LINE Official Account</Field>
        <Field label="โหมดการตอบ">
          {user.mode === "ai" ? (
            <span className="text-brand-dark">Zwiz AI ตอบอัตโนมัติ</span>
          ) : (
            "แอดมินเป็นผู้ตอบ"
          )}
        </Field>
      </dl>
      <p className="mt-auto px-5 py-4 text-xs text-neutral-400">{DEMO_NOTICE}</p>
    </aside>
  );
}
