import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import RefTracker from "@/components/share/RefTracker";
import IdleLogout from "@/components/auth/IdleLogout";
import Footer from "@/components/Footer";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
});

export const metadata: Metadata = {
  title: "옴니마인드 — 모든 나를 잇다",
  description:
    "사주, MBTI, 혈액형, 별자리… 흩어져 있던 '나'의 조각들을 하나로 이어드릴게요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={notoSerifKr.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="app-shell mx-auto min-h-dvh max-w-[var(--shell-width)] bg-warm-base lg:max-w-[var(--shell-width-lg)]">
          <RefTracker />
          <IdleLogout />
          {children}
          <Footer />
          <Analytics />
        </div>
      </body>
    </html>
  );
}
