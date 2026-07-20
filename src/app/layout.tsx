import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import RefTracker from "@/components/share/RefTracker";
import IdleLogout from "@/components/auth/IdleLogout";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { THEME_KEY } from "@/lib/theme/store";
import "./globals.css";

// 첫 페인트 전에 저장된 화면 모드를 <html>에 반영 — React 하이드레이션을 기다리면
// 라이트로 한 프레임 그렸다가 다크로 바뀌는 깜빡임이 생긴다.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}`;

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
    <html lang="ko" className={notoSerifKr.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="app-shell mx-auto min-h-dvh max-w-[var(--shell-width)] bg-warm-base lg:max-w-[var(--shell-width-lg)]">
          <RefTracker />
          <IdleLogout />
          <ThemeToggle />
          {children}
          <Footer />
          <Analytics />
        </div>
      </body>
    </html>
  );
}
