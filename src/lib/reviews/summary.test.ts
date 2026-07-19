import { describe, expect, it } from "vitest";
import { summarize } from "./summary";

const row = (rating: number, comment: string | null, d: string) => ({
  rating, comment, created_at: `${d}T09:00:00+09:00`,
});

describe("summarize (4단계 스펙 §3 — 순수 집계)", () => {
  it("0건 → null(섹션 숨김 — 빈 상태를 꾸미지 않는다)", () => {
    expect(summarize([], 3)).toBeNull();
  });

  it("평균 소수 1자리·개수·코멘트만 최신순 최대 N", () => {
    const s = summarize(
      [row(5, "좋았어요", "2026-07-19"), row(4, null, "2026-07-18"), row(3, "담담했어요", "2026-07-17")],
      1,
    )!;
    expect(s.count).toBe(3);
    expect(s.avg).toBe(4.0);
    expect(s.comments).toEqual([{ comment: "좋았어요", date: "2026-07-19" }]);
  });

  it("코멘트 없는 별점-만 후기는 평균·개수에만 반영된다", () => {
    const s = summarize([row(5, null, "2026-07-19")], 3)!;
    expect(s.count).toBe(1);
    expect(s.comments).toEqual([]);
  });
});
