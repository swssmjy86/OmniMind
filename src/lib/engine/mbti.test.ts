import { describe, expect, it } from "vitest";
import { mbtiTrait, isMbti } from "./mbti";

const ALL = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

describe("MBTI 특성", () => {
  it.each(ALL)("%s: 축 파싱 + 키워드 3개", (t) => {
    const m = mbtiTrait(t);
    expect(m.axes.EI).toBe(t[0]);
    expect(m.axes.SN).toBe(t[1]);
    expect(m.axes.TF).toBe(t[2]);
    expect(m.axes.JP).toBe(t[3]);
    expect(m.keywords.length).toBeGreaterThanOrEqual(3);
  });

  it("잘못된 값 거부", () => {
    expect(isMbti("XXXX")).toBe(false);
    expect(isMbti("enfj")).toBe(false); // 대문자만
    expect(isMbti("ENFJ")).toBe(true);
  });
});
