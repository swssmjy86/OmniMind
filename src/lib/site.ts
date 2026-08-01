// 사이트 절대 URL 해결 — 서버 렌더링 시점(메타데이터·OG·sitemap·robots)에서는
// window.location이 없으므로 환경변수로 기준 origin을 정한다.
// 우선순위: 명시 설정 > Vercel 배포 도메인 > 로컬. 배포 도메인이 잡히기 전에도
// 항상 유효한 절대 URL을 돌려줘 next/og의 상대경로 해석과 OG 미리보기가 깨지지 않는다.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel이 프로덕션/프리뷰 배포에 주입하는 도메인(프로토콜 없음).
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
