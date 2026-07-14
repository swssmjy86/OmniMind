import { describe, expect, it } from "vitest";
import { bloodTrait, isBloodType } from "./blood";

describe("혈액형 특성", () => {
  it.each(["A", "B", "O", "AB"] as const)("%s: 키워드 존재", (t) => {
    expect(bloodTrait(t).type).toBe(t);
    expect(bloodTrait(t).keywords.length).toBeGreaterThan(0);
  });

  it("잘못된 값 거부", () => {
    expect(isBloodType("C")).toBe(false);
    expect(isBloodType("a")).toBe(false);
    expect(isBloodType("AB")).toBe(true);
  });
});
