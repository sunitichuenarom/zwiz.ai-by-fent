"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <main className="flex h-full items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h1 className="text-lg font-semibold">LINE OA Webchat</h1>
        <p className="mt-1 text-sm text-neutral-500">กรอกรหัสเพื่อเข้าใช้งาน</p>
        <label htmlFor="passcode" className="mt-5 block text-sm font-medium">
          รหัสเข้าใช้งาน
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-line focus:ring-2 focus:ring-line/30"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !passcode}
          className="mt-4 w-full rounded-lg bg-line px-4 py-2 font-medium text-white hover:bg-line-dark disabled:opacity-50"
        >
          {submitting ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}
        </button>
      </form>
    </main>
  );
}
