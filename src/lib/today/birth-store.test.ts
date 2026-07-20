import { describe, expect, it } from "vitest";
import { parseTodayBirth } from "./birth-store";

describe("오늘의운세 입력 파싱 (스펙 §3 — localStorage만)", () => {
  it("정상 입력을 파싱한다", () => {
    expect(parseTodayBirth(JSON.stringify({ gender: "male" }))).toEqual({ gender: "male" });
  });

  it("성별 미선택(null)을 허용한다", () => {
    expect(parseTodayBirth(JSON.stringify({ gender: null }))).toEqual({ gender: null });
  });

  it("깨진 값은 null — null·비JSON·잘못된 gender", () => {
    expect(parseTodayBirth(null)).toBeNull();
    expect(parseTodayBirth("not-json")).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ gender: "x" }))).toBeNull();
  });
});
