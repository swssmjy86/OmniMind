import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 공개·색인 대상 페이지만 나열한다(개인화 탭·결제·인증 경로는 robots.ts에서 차단).
// 나머지 경로는 로그인 뒤 개인화 화면이라 색인 가치가 없다.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const routes = [
    { path: "/", priority: 1.0 },
    { path: "/today", priority: 0.9 },
    { path: "/faq", priority: 0.5 },
    { path: "/sources", priority: 0.4 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/contact", priority: 0.3 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority,
  }));
}
