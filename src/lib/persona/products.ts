// 상품 카탈로그 v2(4탭 IA 스펙 §4) — 표현 계층 순수 상수. 접근 "규칙"(잠금·크레딧 차감)은
// 2단계에서 consult/quota.ts의 readingAccess로 들어간다. 여기는 홈 그리드·사주팔자 탭이
// 함께 쓰는 라인업 메타데이터만 둔다.

import type { PersonaId } from "./personas";

export type ProductId =
  | "today" | "chongun" | "career" | "love" | "wealth" | "match" | "marriage";
export type ProductAccess = "free" | "login" | "credit";

export interface Product {
  id: ProductId;
  title: string;
  tagline: string;         // 카드 한 줄 소개 — 톤 가드 준수
  personaId: PersonaId;
  access: ProductAccess;
  href: string;            // 연결 화면 — 전용 라우트가 생기면 갱신(2·3단계)
  status: "live" | "soon"; // soon = 카드 비활성(링크 없음)
}

export const PRODUCTS: Product[] = [
  {
    id: "today", title: "오늘의운세", personaId: "dalzigi",
    tagline: "매일 밤 새로 켜지는 오늘의 기운",
    access: "free", href: "/today", status: "live",
  },
  {
    id: "chongun", title: "총운", personaId: "seoon",
    tagline: "여덟 글자에 담긴 인생 전반의 흐름",
    access: "free", href: "/saju/chongun", status: "live",
  },
  {
    id: "career", title: "직업운", personaId: "seoon",
    tagline: "일과 재능의 결이 흐르는 방향",
    access: "free", href: "/saju/career", status: "live",
  },
  {
    id: "love", title: "연애운", personaId: "hongyeon",
    tagline: "다가오는 인연과 마음의 흐름",
    access: "free", href: "/saju/love", status: "live",
  },
  {
    id: "wealth", title: "재물운", personaId: "geumo",
    tagline: "재물의 물길이 흐르는 방향",
    access: "free", href: "/saju/wealth", status: "live",
  },
  {
    id: "match", title: "궁합", personaId: "hongyeon",
    tagline: "두 사람의 기운이 만나는 자리",
    access: "free", href: "/saju/match-deep", status: "live",
  },
  {
    id: "marriage", title: "결혼운", personaId: "hongyeon",
    tagline: "함께 걷는 길의 때와 결",
    access: "free", href: "/saju/marriage", status: "live",
  },
];

export const ACCESS_LABEL: Record<ProductAccess, string> = {
  free: "누구나 무료",
  login: "로그인하면 무료",
  credit: "크레딧",
};

/** 상품 ID → 페르소나. LLM 시스템 프롬프트(chat-prompt.ts)가 상품별 말투를 고를 때 쓴다 —
 *  PRODUCTS의 personaId를 다시 옮겨 적지 않도록 한 번만 파생시킨다. */
export const PRODUCT_PERSONA: Record<ProductId, PersonaId> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p.personaId]),
) as Record<ProductId, PersonaId>;
