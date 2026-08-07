import type { MetadataRoute } from "next";

// PWA 매니페스트 — 모바일 웹 우선 서비스라 '홈 화면에 추가' 시 브랜드가 유지되도록.
// 기본 무드(다크·밤 네이비)에 맞춰 배경/테마 색을 잡는다. 브랜드 마크(딥그린 초승달 +
// 코랄 별자리) PNG 아이콘 세트(public/icon-512·192.png)를 사용한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "옴니마인드 — 모든 나를 잇다",
    short_name: "옴니마인드",
    description:
      "사주와 별자리… 흩어져 있던 '나'의 조각들을 하나로 이어드릴게요.",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1626",
    theme_color: "#0e1626",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
