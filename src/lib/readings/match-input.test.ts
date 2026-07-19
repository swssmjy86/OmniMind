import { describe, expect, it } from "vitest";
import { parseMatchDeepInput } from "./match-input";

const valid = {
  birthDate: "1992-03-10", birthTime: "14:20", timeUnknown: false,
  mbti: "ISTP", bloodType: "O", mode: "lover",
};

describe("궁합 심층 상대 입력 검증 (3단계 스펙 §5)", () => {
  it("정상 입력 — 모드 슬러그가 한글 모드로 변환된다", () => {
    expect(parseMatchDeepInput(valid)).toEqual({
      birthDate: "1992-03-10", birthTime: "14:20", timeUnknown: false,
      mbti: "ISTP", bloodType: "O", mode: "연인",
    });
  });

  it("시간 모름 — birthTime은 null로 정규화", () => {
    const out = parseMatchDeepInput({ ...valid, birthTime: "", timeUnknown: true });
    expect(out?.birthTime).toBeNull();
    expect(out?.timeUnknown).toBe(true);
  });

  it("위반은 전부 null — 날짜 형식·시간 형식·MBTI·혈액형·모드", () => {
    expect(parseMatchDeepInput({ ...valid, birthDate: "1992/03/10" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, birthTime: "25:00" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, mbti: "ABCD" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, bloodType: "C" })).toBeNull();
    expect(parseMatchDeepInput({ ...valid, mode: "rival" })).toBeNull();
    expect(parseMatchDeepInput(null)).toBeNull();
    expect(parseMatchDeepInput("str")).toBeNull();
  });
});
