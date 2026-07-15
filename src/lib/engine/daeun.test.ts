import { describe, expect, it } from "vitest";
import { computeDaeun, currentDaeun, type Daeun } from "./daeun";
import { computePillars } from "./pillars";
import { kstStringToInstant } from "./kst";

// 1990-03-15 08:30 — 경오년(양간)·기묘월
const birth = kstStringToInstant("1990-03-15T08:30");
const fp = computePillars(birth, { timeUnknown: false });

describe("computeDaeun — 대운 방향·대운수·간지 흐름", () => {
  it("양년생 남성은 순행 — 월주 다음 간지부터 10개", () => {
    const d = computeDaeun(birth, fp, "male");
    expect(d.direction).toBe("순행");
    // 기묘월 → 첫 대운은 경진
    expect(d.pillars[0]).toBe("경진");
    expect(d.pillars[1]).toBe("신사");
    expect(d.pillars).toHaveLength(10);
    // 경칩(3/6)~청명(4/5) 사이 출생, 다음 절입까지 약 21일 → 대운수 7 부근
    expect(d.startAge).toBeGreaterThanOrEqual(6);
    expect(d.startAge).toBeLessThanOrEqual(8);
  });

  it("양년생 여성은 역행 — 월주 이전 간지부터 10개", () => {
    const d = computeDaeun(birth, fp, "female");
    expect(d.direction).toBe("역행");
    // 기묘월 → 첫 대운은 무인
    expect(d.pillars[0]).toBe("무인");
    expect(d.pillars[1]).toBe("정축");
    // 직전 절입(경칩)부터 약 9일 → 대운수 3 부근
    expect(d.startAge).toBeGreaterThanOrEqual(2);
    expect(d.startAge).toBeLessThanOrEqual(4);
  });

  it("음년생은 방향이 반대(음남 역행·음녀 순행)", () => {
    // 1991 = 신미년(신=음간)
    const b2 = kstStringToInstant("1991-06-10T10:00");
    const fp2 = computePillars(b2, { timeUnknown: false });
    expect(computeDaeun(b2, fp2, "male").direction).toBe("역행");
    expect(computeDaeun(b2, fp2, "female").direction).toBe("순행");
  });

  it("대운수는 1~10 범위의 정수", () => {
    for (const g of ["male", "female"] as const) {
      const d = computeDaeun(birth, fp, g);
      expect(Number.isInteger(d.startAge)).toBe(true);
      expect(d.startAge).toBeGreaterThanOrEqual(1);
      expect(d.startAge).toBeLessThanOrEqual(10);
    }
  });

  it("결정적 — 같은 입력이면 같은 결과", () => {
    expect(computeDaeun(birth, fp, "male")).toEqual(computeDaeun(birth, fp, "male"));
  });
});

describe("currentDaeun — 나이로 현재 대운 찾기", () => {
  const d: Daeun = { direction: "순행", startAge: 7, pillars: [
    "경진","신사","임오","계미","갑신","을유","병술","정해","무자","기축",
  ] };

  it("첫 대운 전이면 null", () => {
    expect(currentDaeun(d, 5)).toBeNull();
  });
  it("대운 구간을 정확히 짚는다", () => {
    expect(currentDaeun(d, 7)).toEqual({ ganzhi: "경진", fromAge: 7, toAge: 16 });
    expect(currentDaeun(d, 16)).toEqual({ ganzhi: "경진", fromAge: 7, toAge: 16 });
    expect(currentDaeun(d, 17)).toEqual({ ganzhi: "신사", fromAge: 17, toAge: 26 });
    expect(currentDaeun(d, 36)).toEqual({ ganzhi: "임오", fromAge: 27, toAge: 36 });
  });
  it("범위를 넘어서면 마지막 대운으로 클램프", () => {
    expect(currentDaeun(d, 150)!.ganzhi).toBe("기축");
  });
});
