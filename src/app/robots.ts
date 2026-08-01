import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 검색엔진 크롤링 규칙. 로그인 전용 개인화 탭·결제·인증·API는 색인에서 제외하고,
// 공개 진입점(홈·오늘의운세·사주/유명인 랜딩·안내 페이지)만 노출한다.
// (/today는 비로그인 무료, /saju·/celeb은 게스트 티저가 있어 공개 랜딩으로 남긴다.
//  /me·/mind·/concern·/match는 로그인해야 내용이 있어 로그아웃 시 얇은 "프로필 필요"
//  화면만 남으므로 색인 가치가 없다 — 중복·저품질 색인을 막는다.)
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/premium/",
        "/onboarding",
        "/me",
        "/mind",
        "/concern",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
