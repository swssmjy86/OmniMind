import { describe, expect, it } from "vitest";
import { validateCheer, CHEER_MAX } from "./validate";

describe("validateCheer", () => {
  it("공백을 정리하고 통과시킨다", () => {
    const r = validateCheer("  오늘도   힘내요  ");
    expect(r).toEqual({ ok: true, value: "오늘도 힘내요" });
  });

  it("너무 짧으면 거부한다", () => {
    expect(validateCheer("").ok).toBe(false);
    expect(validateCheer(" 아 ").ok).toBe(false);
  });

  it("최대 길이를 넘으면 거부한다", () => {
    expect(validateCheer("가".repeat(CHEER_MAX + 1)).ok).toBe(false);
    expect(validateCheer("가".repeat(CHEER_MAX)).ok).toBe(true);
  });
});
