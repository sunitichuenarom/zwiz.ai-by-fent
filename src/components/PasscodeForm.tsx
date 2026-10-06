"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { DEMO_NOTICE } from "@/lib/fetcher";

export function PasscodeForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    setSubmitting(false);
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6"
      >
        <Logo />
        <h1 className="mt-2 font-brand text-xl font-semibold">Zwiz Chat</h1>
        <p className="text-[13px] text-neutral-500">กรอกรหัสเพื่อเข้าใช้งาน</p>
        <label htmlFor="passcode" className="mt-4 block text-[13px] font-medium">
          รหัสเข้าใช้งาน
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !passcode}
          className="mt-3 w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}
        </button>
      </form>
      <p className="text-xs text-neutral-400">{DEMO_NOTICE}</p>
    </main>
  );
}
