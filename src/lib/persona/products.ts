// P9 상품 카탈로그(설계서 §2.1) — 표현 계층 순수 상수. 접근 "규칙"(잠금·크레딧 차감 판정)은
// 2단계에서 consult/quota.ts의 readingAccess로 들어간다(§6.3). 여기는 홈·카드가 보여줄
// 라인업 메타데이터만 둔다. 1단계에서 href는 기존 화면이다 — 단계가 진행되며 갱신된다.

import type { PersonaId } from "./personas";

export type ProductId = "daily" | "profile_deep" | "match_deep" | "fate" | "wealth";
export type ProductAccess = "free" | "login" | "credit";

export interface Product {
  id: ProductId;
  title: string;
  tagline: string;         // 카드 한 줄 소개 — 톤 가드 준수
  personaId: PersonaId;
  access: ProductAccess;
  href: string;            // 연결 화면. 1단계는 기존 화면(/me·/match)
  status: "live" | "soon"; // soon = 카드 비활성(링크 없음)
}

export const PRODUCTS: Product[] = [
  {
    id: "daily", title: "오늘의 일진", personaId: "dalzigi",
    tagline: "매일 밤 새로 켜지는 오늘의 기운",
    access: "free", href: "/daily", status: "live",
  },
  {
    id: "profile_deep", title: "내 사주 심층 풀이", personaId: "seoon",
    tagline: "여덟 글자에 담긴 당신의 결을 깊이",
    access: "login", href: "/me", status: "live",
  },
  {
    id: "match_deep", title: "궁합 심층", personaId: "hongyeon",
    tagline: "두 사람의 기운이 만나는 자리",
    access: "credit", href: "/match", status: "live",
  },
  {
    id: "fate", title: "인연 풀이", personaId: "hongyeon",
    tagline: "당신에게 다가오는 인연의 흐름",
    access: "credit", href: "", status: "soon",
  },
  {
    id: "wealth", title: "재물 풀이", personaId: "geumo",
    tagline: "재물의 물길이 흐르는 방향",
    access: "credit", href: "", status: "soon",
  },
];

export const ACCESS_LABEL: Record<ProductAccess, string> = {
  free: "누구나 무료",
  login: "로그인하면 무료",
  credit: "크레딧",
};
