import { describe, expect, it } from "vitest";
import { toTrueInstant, inHalfHourEra } from "./clock";
import { computePillars, hourBranchIndex } from "./pillars";
import { computeProfile } from "./index";
import { kstStringToInstant, toKstParts } from "./kst";

const at = (s: string) => kstStringToInstant(s);
const shifted = (s: string, min: number) => new Date(at(s).getTime() + min * 60_000);

// 1954-03-21~1961-08-09 한국의 시계는 동경 127.5°(UTC+8:30) 기준이라 지금보다 30분 느렸다.
// 같은 오프셋을 쓰던 1908-04-01~1911-12-31 구간도 함께 되돌린다.
describe("toTrueInstant — 역사적 시계 보정", () => {
  it("UTC+8:30 시대 기록은 +30분 해야 동경 135° 기준의 같은 순간이 된다", () => {
    expect(toTrueInstant(at("1954-07-01T12:00"))).toEqual(shifted("1954-07-01T12:00", 30));
    expect(toTrueInstant(at("1961-08-09T23:00"))).toEqual(shifted("1961-08-09T23:00", 30));
    expect(toTrueInstant(at("1910-05-05T08:00"))).toEqual(shifted("1910-05-05T08:00", 30));
  });

  it("경계: 시대 시작 시각부터 적용, 종료 시각부터 해제", () => {
    expect(toTrueInstant(at("1954-03-21T00:00"))).toEqual(shifted("1954-03-21T00:00", 30));
    expect(toTrueInstant(at("1954-03-20T22:00"))).toEqual(at("1954-03-20T22:00")); // 직전 = 무보정
    expect(toTrueInstant(at("1961-08-10T00:00"))).toEqual(at("1961-08-10T00:00")); // 해제 = 무보정
    expect(toTrueInstant(at("1908-04-01T00:00"))).toEqual(shifted("1908-04-01T00:00", 30));
    expect(toTrueInstant(at("1912-01-01T00:00"))).toEqual(at("1912-01-01T00:00"));
  });

  it("서머타임과 겹치는 1955~60년 여름은 두 보정이 합쳐져 −30분이 된다", () => {
    // 1955-07-01: 서머타임(−1h) + UTC+8:30(+30m) → 순 −30분
    expect(toTrueInstant(at("1955-07-01T12:00"))).toEqual(shifted("1955-07-01T12:00", -30));
    // 같은 해 겨울은 서머타임 밖 → +30분만
    expect(toTrueInstant(at("1955-12-01T12:00"))).toEqual(shifted("1955-12-01T12:00", 30));
  });

  it("1987~88 서머타임은 UTC+9 시대라 −1h만 적용된다", () => {
    expect(toTrueInstant(at("1987-07-01T12:00"))).toEqual(shifted("1987-07-01T12:00", -60));
  });

  it("UTC+9 시대(1912~1954, 1961~)는 그대로 둔다", () => {
    for (const s of ["1930-06-15T09:00", "1950-01-01T00:00", "1970-01-01T12:00", "1990-03-15T08:30", "2026-07-16T10:00"]) {
      expect(toTrueInstant(at(s))).toEqual(at(s));
    }
  });

  it("inHalfHourEra는 두 시대만 참", () => {
    expect(inHalfHourEra(at("1954-07-01T12:00"))).toBe(true);
    expect(inHalfHourEra(at("1910-01-01T12:00"))).toBe(true);
    expect(inHalfHourEra(at("1930-01-01T12:00"))).toBe(false);
    expect(inHalfHourEra(at("1990-01-01T12:00"))).toBe(false);
  });
});

// 30분은 시주 경계(2시간)와 일주 경계(23시)를 실제로 넘긴다 — 그래서 이 보정이 사주를 바꾼다.
describe("표준시 보정이 사주에 미치는 영향", () => {
  it("시주: 1954-07-01 12:45 기록 → 실제 13:15 → 오시가 아니라 미시", () => {
    const fp = computePillars(at("1954-07-01T12:45"), { timeUnknown: false });
    expect(fp.hour!.branch).toBe(hourBranchIndex(13)); // 미(7)
    expect(fp.hour!.branch).not.toBe(hourBranchIndex(12)); // 오(6) 아님
  });

  it("일주: 1954-07-01 22:45 기록 → 실제 23:15 → 야자시로 다음날 일주", () => {
    const corrected = computePillars(at("1954-07-01T22:45"), { timeUnknown: false });
    const nextDayNoon = computePillars(at("1954-07-02T12:00"), { timeUnknown: false });
    expect(corrected.day).toEqual(nextDayNoon.day);
    expect(corrected.hour!.branch).toBe(hourBranchIndex(23)); // 자(0)
  });

  it("보정된 시각이 실제로 30분 뒤임을 시각 컴포넌트로 확인", () => {
    expect(toKstParts(toTrueInstant(at("1954-07-01T12:45")))).toMatchObject({ h: 13, mi: 15 });
  });

  it("시간 미상은 UTC+8:30 시대에도 기록된 출생일의 일주를 유지한다", () => {
    for (const date of ["1954-07-01", "1955-07-01", "1960-05-01"]) {
      const unknown = computePillars(at(`${date}T00:00`), { timeUnknown: true });
      const knownNoon = computePillars(at(`${date}T12:00`), { timeUnknown: false });
      expect(unknown.day, `${date} 일주`).toEqual(knownNoon.day);
    }
  });
});

// 대운도 4주와 같은 시각을 봐야 한다. 대운수 = 절입까지의 일수÷3이라 30분·12시간의 차이가
// 그대로 나이를 바꾼다 — 아래 두 사례는 보정을 빼면 값이 달라지므로, 되돌리면 실패한다.
// (탐색 결과 1954~61 구간에서만 135건, 시간미상은 1990~2000 3년치에서 305건이 갈렸다.)
describe("대운이 4주와 같은 보정 시각을 쓴다", () => {
  const base = { bloodType: "A", mbti: "INFP", timeUnknown: false } as const;

  it("UTC+8:30 시대: 보정(+30분)이 대운수를 바꾼다 — 1954-03-22 23:45 여성", () => {
    // 보정 없이 기록 시각을 그대로 쓰면 startAge=5가 된다.
    const ctx = computeProfile({ ...base, birthDate: "1954-03-22", birthTime: "23:45", gender: "female" });
    expect(ctx.daeun!.startAge).toBe(6);
  });

  it("서머타임 밖 UTC+8:30 시대: 1956-11-08 23:45 남성", () => {
    // 보정 없이는 startAge=10.
    const ctx = computeProfile({ ...base, birthDate: "1956-11-08", birthTime: "23:45", gender: "male" });
    expect(ctx.daeun!.startAge).toBe(9);
  });

  it("시간 미상은 자정이 아니라 그날 정오 기준 — 1990-01-01 여성", () => {
    // 자정(옛 동작)이면 startAge=2, 정오(현 동작)면 1.
    const ctx = computeProfile({
      ...base, timeUnknown: true, birthDate: "1990-01-01", birthTime: null, gender: "female",
    });
    expect(ctx.daeun!.startAge).toBe(1);
  });
});
