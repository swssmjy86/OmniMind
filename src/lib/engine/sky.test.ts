import { describe, expect, it } from "vitest";
import { moonPhaseOf, riseSetOf, sunAltitudeOf } from "./sky";

// 물리적으로 결정되는 값이라 KASI 없이도 천문학적 사실로 대조 가능(오프라인·결정론적).
// solar-terms.usno.test.ts와 같은 철학: 외부 API가 아니라 알려진 사실로 검증한다.

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

describe("moonPhaseOf", () => {
  it("2024-04-09(북미 개기일식 다음날, KST 기준 삭 당일)는 삭(신월) 근처다", () => {
    // 일식(2024-04-08 18:21 UTC)은 삭이 아니면 일어날 수 없다. 이 순간은 KST로
    // 2024-04-09 03:21이라 KST 달력으로는 4/9가 삭 당일이다 — phaseAngle은 0 근처여야 한다.
    const r = moonPhaseOf({ y: 2024, mo: 4, d: 9 });
    const distFromZero = Math.min(r.phaseAngle, 360 - r.phaseAngle);
    expect(distFromZero).toBeLessThan(15);
    expect(r.phaseName).toBe("삭");
    expect(r.ageDays).toBeGreaterThanOrEqual(0);
    expect(r.ageDays).toBeLessThan(2);
  });

  it("2022-11-08(개기월식 당일)는 망(보름) 근처다", () => {
    // 월식도 망이 아니면 일어날 수 없다 — phaseAngle은 180 근처여야 한다.
    const r = moonPhaseOf({ y: 2022, mo: 11, d: 8 });
    expect(Math.abs(r.phaseAngle - 180)).toBeLessThan(15);
    expect(r.phaseName).toBe("보름");
  });

  it("phaseAngle·illumination·ageDays는 항상 유효 범위 안에 있다", () => {
    const r = moonPhaseOf({ y: 2025, mo: 6, d: 15 });
    expect(r.phaseAngle).toBeGreaterThanOrEqual(0);
    expect(r.phaseAngle).toBeLessThan(360);
    expect(r.illumination).toBeGreaterThanOrEqual(0);
    expect(r.illumination).toBeLessThanOrEqual(1);
    expect(r.ageDays).toBeGreaterThanOrEqual(0);
    expect(r.ageDays).toBeLessThan(30);
  });
});

describe("sunAltitudeOf — 서울(37.5665N) 남중고도", () => {
  it("하지(2024-06-21) 남중고도는 약 76도다", () => {
    // 90 - |lat - dec| = 90 - |37.5665 - 23.44| ≈ 75.9
    const r = sunAltitudeOf({ y: 2024, mo: 6, d: 21 });
    expect(r.altitudeDeg).toBeGreaterThan(73);
    expect(r.altitudeDeg).toBeLessThan(79);
  });

  it("동지(2024-12-21) 남중고도는 약 29도다", () => {
    // 90 - |37.5665 - (-23.44)| ≈ 29.0
    const r = sunAltitudeOf({ y: 2024, mo: 12, d: 21 });
    expect(r.altitudeDeg).toBeGreaterThan(26);
    expect(r.altitudeDeg).toBeLessThan(32);
  });

  it("남중 시각은 정오 부근(서울은 KST 자오선보다 서쪽이라 12:20~12:40대)이다", () => {
    const r = sunAltitudeOf({ y: 2024, mo: 6, d: 21 });
    const mins = toMinutes(r.noonKst);
    expect(mins).toBeGreaterThan(12 * 60);
    expect(mins).toBeLessThan(13 * 60);
  });
});

describe("riseSetOf — 서울 해/달 출몰", () => {
  it("하지 낮 길이가 동지보다 3시간 이상 길다", () => {
    const summer = riseSetOf({ y: 2024, mo: 6, d: 21 });
    const winter = riseSetOf({ y: 2024, mo: 12, d: 21 });
    expect(summer.sunriseKst).not.toBeNull();
    expect(summer.sunsetKst).not.toBeNull();
    expect(winter.sunriseKst).not.toBeNull();
    expect(winter.sunsetKst).not.toBeNull();
    const summerLen = toMinutes(summer.sunsetKst!) - toMinutes(summer.sunriseKst!);
    const winterLen = toMinutes(winter.sunsetKst!) - toMinutes(winter.sunriseKst!);
    expect(summerLen - winterLen).toBeGreaterThan(180);
  });

  it("춘분(2024-03-20) 낮 길이는 12시간 근방(±20분)이다", () => {
    const r = riseSetOf({ y: 2024, mo: 3, d: 20 });
    const len = toMinutes(r.sunsetKst!) - toMinutes(r.sunriseKst!);
    expect(len).toBeGreaterThan(11 * 60 + 40);
    expect(len).toBeLessThan(12 * 60 + 20);
  });

  it("일출은 자정~정오 사이, 일몰은 정오~24시 사이여야 한다(경계 이월 없음)", () => {
    const r = riseSetOf({ y: 2025, mo: 9, d: 1 });
    const sunrise = toMinutes(r.sunriseKst!);
    const sunset = toMinutes(r.sunsetKst!);
    expect(sunrise).toBeGreaterThan(0);
    expect(sunrise).toBeLessThan(12 * 60);
    expect(sunset).toBeGreaterThan(12 * 60);
    expect(sunset).toBeLessThan(24 * 60);
  });
});
