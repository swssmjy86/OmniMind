import { describe, expect, it } from "vitest";
import { parseTodayBirth } from "./birth-store";

describe("오늘의운세 입력 파싱 (스펙 §3 — localStorage만)", () => {
  it("정상 입력을 파싱한다", () => {
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", gender: "male" }))).toEqual({
      birthDate: "1990-06-15", gender: "male",
    });
  });

  it("성별 미선택(null)을 허용한다", () => {
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", gender: null }))).toEqual({
      birthDate: "1990-06-15", gender: null,
    });
  });

  it("깨진 값은 null — null·비JSON·birthDate 형식 위반·잘못된 gender", () => {
    expect(parseTodayBirth(null)).toBeNull();
    expect(parseTodayBirth("not-json")).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ gender: "male" }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990/06/15", gender: null }))).toBeNull();
    expect(parseTodayBirth(JSON.stringify({ birthDate: "1990-06-15", gender: "x" }))).toBeNull();
  });
});
