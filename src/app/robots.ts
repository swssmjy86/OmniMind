import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 검색엔진 크롤링 규칙. 개인화·결제·인증·API 경로는 색인에서 제외하고,
// 공개 마케팅/안내 페이지만 노출한다.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/premium/", "/onboarding", "/connect/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
