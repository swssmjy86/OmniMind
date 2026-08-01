import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import RefTracker from "@/components/share/RefTracker";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { THEME_KEY } from "@/lib/theme/store";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// 첫 페인트 전에 저장된 화면 모드를 <html>에 반영 — React 하이드레이션을 기다리면
// 잘못된 모드로 한 프레임 그렸다가 바뀌는 깜빡임이 생긴다.
// 기본 모드는 다크 — 저장된 값이 없거나 "dark"면 다크, "light"면 라이트, "system"이면
// data-theme을 비워 globals.css의 prefers-color-scheme(기기 설정) 분기를 따른다.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"){document.documentElement.setAttribute("data-theme","light");}else if(t!=="system"){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}`;

const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-serif-kr",
});

const SITE_URL = siteUrl();
const TITLE = "옴니마인드 — 모든 나를 잇다";
const DESCRIPTION =
  "사주와 별자리… 흩어져 있던 '나'의 조각들을 하나로 이어드릴게요.";

export const metadata: Metadata = {
  // OG 이미지 등 상대 URL의 절대화 기준 — 없으면 next/og 상대경로가 깨지고 빌드 경고가 뜬다.
  metadataBase: new URL(SITE_URL),
  // 각 페이지는 "오늘의운세 — 옴니마인드"처럼 전체 제목을 직접 지정한다(기존 컨벤션).
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "옴니마인드",
  // 카카오톡·SNS 링크 공유 미리보기. opengraph-image.tsx가 대표 이미지를 자동 연결한다.
  openGraph: {
    type: "website",
    siteName: "옴니마인드",
    locale: "ko_KR",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // PWA — 모바일 웹 우선 서비스라 '홈 화면에 추가' 시 브랜드가 유지되도록.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "옴니마인드",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // 앱 기본 무드는 다크(밤 네이비) — 주소창/상태바 색을 모드별로 맞춘다.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1626" },
  ],
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
          <ThemeToggle />
          {children}
          <Footer />
          <Analytics />
        </div>
      </body>
    </html>
  );
}
