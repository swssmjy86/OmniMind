// 풀이 캐시 키(2단계 스펙 §3) — 같은 입력은 반드시 같은 해시가 되어야 "같은 해석을 두 번
// 생성하지 않는다"(P9 §6.2)가 성립한다. DB jsonb 왕복은 키 순서를 바꿀 수 있으므로
// 재귀 키 정렬로 정규화한 뒤 해시한다. 서버 전용(node:crypto).
import { createHash } from "node:crypto";
import { PROFILE_CONTEXT_VERSION } from "@/lib/engine/index";

/** 재귀 키 정렬 JSON 직렬화 — 객체 키 순서와 무관하게 같은 값이면 같은 문자열. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * 템플릿 문구 버전 — 풀이 본문 카피가 의미 있게 바뀐 "상품"의 호출부만 올려서 넘긴다.
 * 캐시된 옛 문구 풀이가 재생성 대상이 되게 해시에 섞는다(엔진 버전과 별개 — 계산은 그대로,
 * 문장만 바뀐 경우). 전역으로 올리면 문구가 안 바뀐 상품(총운)까지 캐시가 통째로 버려지고,
 * 옛 readings 행에 붙은 후기(reading_reviews)가 고아가 되므로 상품별로 선택한다.
 * v2: 페르소나 전면 몰입(2026-07-23) — 크레딧 4종(벼리·홍연·금오·온새)·궁합(연리)만 해당.
 */
export const READING_TEMPLATE_VERSION = 2;

/**
 * 풀이 입력 해시 — 프로필 컨텍스트 + 엔진·템플릿 버전 + 현재 대운 간지(대운이 바뀌면 '운의
 * 계절' 섹션이 바뀌므로 캐시도 자연 무효화). season은 대운 미상이면 "none".
 * templateVersion 기본값 1은 해시에 넣지 않는다 — v1 시절(필드 없던 때) 해시와 동일하게
 * 유지되어, 문구가 안 바뀐 상품의 기존 캐시·후기가 그대로 살아 있다.
 */
export function readingInputHash(ctx: unknown, season: string, templateVersion = 1): string {
  return createHash("sha256")
    .update(stableStringify({
      v: PROFILE_CONTEXT_VERSION,
      ...(templateVersion > 1 ? { tv: templateVersion } : {}),
      season, ctx,
    }))
    .digest("hex");
}
