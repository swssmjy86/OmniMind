import { describe, expect, it } from "vitest";
import { parseTodayBirth } from "./birth-store";

const valid = JSON.stringify({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false, gender: "male",
});

describe("오늘의운세 입력 파싱 (스펙 §3 — localStorage만)", () => {
  it("정상 입력을 파싱한다", () => {
    expect(parseTodayBirth(valid)).toEqual({
      birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false, gender: "male",
    });
  });

  it("시간 모름이면 빈 birthTime을 허용한다", () => {
    const raw = JSON.stringify({ birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: null });
    expect(parseTodayBirth(raw)?.timeUnknown).toBe(true);
  });

  it("깨진 값은 null — null·비JSON·형식 위반·잘못된 gender", () => {
    expect(parseTodayBirth(null)).toBeNull();
    expect(parseTodayBirth("not-json")).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990/06/15", birthTime: "", timeUnknown: true }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", birthTime: "7시", timeUnknown: false }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", birthTime: "", timeUnknown: true, gender: "x" }))).toBeNull();
  });
});
