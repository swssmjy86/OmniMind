import { describe, expect, it } from "vitest";
import { ipchunInstant, resolveMonth, assertYearInRange, termInstant } from "./solar-terms";
import { toKstParts, kstStringToInstant } from "./kst";
import { SOLAR_TERMS } from "./solar-terms.data";

describe("절기 테이블", () => {
  it("입춘 절입 시각이 2월 4일 전후(KST)로 산출된다", () => {
    const p = toKstParts(ipchunInstant(2000));
    expect(p.mo).toBe(2);
    expect(p.d).toBe(4);
  });

  it("KASI 공인 시각과 1분 이내 일치 (astronomy-engine 테이블)", () => {
    // 2024 입춘 KASI 공표 = 17:27 KST. 테이블은 초 단위(17:26:50)라 1분 미만 차이가 정상.
    const diffMs = Math.abs(ipchunInstant(2024).getTime() - kstStringToInstant("2024-02-04T17:27").getTime());
    expect(diffMs).toBeLessThan(60_000);
  });

  it("입춘 직전은 축월(1), 직후는 인월(2)", () => {
    const ipchun = ipchunInstant(2000).getTime();
    const before = resolveMonth(new Date(ipchun - 60_000)); // 1분 전
    const after = resolveMonth(new Date(ipchun + 60_000)); // 1분 후
    expect(before.monthBranch).toBe(1); // 축
    expect(after.monthBranch).toBe(2); // 인
  });

  it("입춘 전 출생은 전년 절기해, 후는 당년", () => {
    const ipchun = ipchunInstant(2000).getTime();
    expect(resolveMonth(new Date(ipchun - 60_000)).solarYear).toBe(1999);
    expect(resolveMonth(new Date(ipchun + 60_000)).solarYear).toBe(2000);
  });

  it("24절기가 모두 해당 연도 안에 산출된다(춘분 버그 회귀 방지)", () => {
    for (let idx = 0; idx < 24; idx++) {
      expect(toKstParts(termInstant(2024, idx)).y).toBe(2024);
    }
  });

  it("한여름/한겨울 월지: 하지 근처=오월(6), 대설 근처=자월(0)", () => {
    const summer = resolveMonth(kstStringToInstant("2000-06-25T12:00"));
    const winter = resolveMonth(kstStringToInstant("2000-12-10T12:00"));
    expect(summer.monthBranch).toBe(6); // 오
    expect(winter.monthBranch).toBe(0); // 자
  });

  it("범위 밖 연도는 예외", () => {
    expect(() => assertYearInRange(1899)).toThrow(RangeError);
    expect(() => assertYearInRange(2101)).toThrow(RangeError);
  });

  // 생성기·외부 대조가 오염된 값을 들여오는 사고 방지 —
  // 실제로 KASI API 원본에 "17:60" 같은 불법 시각, +1일 어긋난 날짜가 존재했다.
  it("전 연도 무결성: 24개 항목, 유효한 시각, 연내 단조 증가", () => {
    for (const [year, terms] of Object.entries(SOLAR_TERMS)) {
      expect(terms, `${year}년 항목 수`).toHaveLength(24);
      let prev = -Infinity;
      for (const s of terms) {
        const t = kstStringToInstant(s).getTime();
        expect(Number.isFinite(t), `${year}년 파싱 불가 값: ${s}`).toBe(true);
        expect(t, `${year}년 순서 역전: ${s}`).toBeGreaterThan(prev);
        prev = t;
      }
    }
  });
});
