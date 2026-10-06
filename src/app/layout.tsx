import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Kanit } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Zwiz Chat",
  description: "กล่องข้อความสำหรับแอดมิน รับและตอบแชท LINE OA พร้อม Zwiz AI ช่วยตอบ (เดโมสำหรับแบบทดสอบ)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} ${kanit.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
