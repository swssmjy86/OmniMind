import { describe, expect, it } from "vitest";
import { readingInputHash, stableStringify } from "./hash";

describe("풀이 캐시 키 (2단계 스펙 §3)", () => {
  it("stableStringify — 키 순서가 달라도 같은 문자열", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      stableStringify({ a: { c: [3, { e: 5, f: 4 }], d: 2 }, b: 1 }),
    );
  });

  it("같은 입력 → 같은 해시(64자 hex), 키 순서 무관", () => {
    const h1 = readingInputHash({ x: 1, y: 2 }, "경오");
    const h2 = readingInputHash({ y: 2, x: 1 }, "경오");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ctx·대운 간지가 바뀌면 해시가 달라진다", () => {
    const base = readingInputHash({ x: 1 }, "경오");
    expect(readingInputHash({ x: 2 }, "경오")).not.toBe(base);
    expect(readingInputHash({ x: 1 }, "신미")).not.toBe(base); // 대운 경계 → 자연 재생성
    expect(readingInputHash({ x: 1 }, "none")).not.toBe(base);
  });

  it("템플릿 버전 — 기본값 1은 v1 시절(버전 필드 없음) 해시와 동일, 2 이상만 재생성 유발", () => {
    const base = readingInputHash({ x: 1 }, "경오");
    // 문구가 안 바뀐 상품(총운)의 기존 캐시·후기가 살아 있으려면 기본값이 해시를 바꾸면 안 된다
    expect(readingInputHash({ x: 1 }, "경오", 1)).toBe(base);
    expect(readingInputHash({ x: 1 }, "경오", 2)).not.toBe(base);
    expect(readingInputHash({ x: 1 }, "경오", 2)).toBe(readingInputHash({ x: 1 }, "경오", 2));
  });
});
