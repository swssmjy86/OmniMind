import { describe, expect, it } from "vitest";
import { inDst, DST_PERIODS } from "./clock";
import { computePillars } from "./pillars";
import { kstStringToInstant } from "./kst";

// 서머타임 '구간 판정'만 다룬다 — 실제 보정량과 표준시 오프셋과의 합성은 clock.test.ts.
// (1955~60년은 UTC+8:30 시대와 겹쳐 순 보정이 −30분이라, 여기서 −1h를 단정하면 두 관심사가 섞인다.)
//
// 1948~1960 구간은 IANA tzdata(Rule ROK)·국가기록원 기록 기준.
// 경계 규약: 시작 시각부터 적용(>= start), 종료 시각 직전까지 적용(< end).
// 종료 직전 1시간(시계를 되돌려 두 번 존재하는 벽시계)은 서머타임 쪽으로 해석한다.
const at = (s: string) => kstStringToInstant(s);

describe("서머타임 구간 판정", () => {
  it("시행 연도 12개(1948~51, 1955~60, 1987~88)가 모두 등록되어 있다", () => {
    const years = DST_PERIODS.map((p) => Number(p.start.slice(0, 4)));
    for (const y of [1948, 1949, 1950, 1951, 1955, 1956, 1957, 1958, 1959, 1960, 1987, 1988]) {
      expect(years).toContain(y);
    }
  });

  it("구간 한복판 출생은 서머타임에 속한다", () => {
    for (const s of ["1948-08-15T12:00", "1956-07-01T06:30", "1960-08-15T00:30", "1987-07-01T12:00"]) {
      expect(inDst(at(s)), s).toBe(true);
    }
  });

  it("시작 경계: 시행 시각 정각부터 속하고, 직전은 아니다", () => {
    expect(inDst(at("1948-06-01T00:00"))).toBe(true);
    expect(inDst(at("1948-05-31T23:59"))).toBe(false);
    expect(inDst(at("1957-05-05T00:00"))).toBe(true);
    expect(inDst(at("1957-05-04T23:59"))).toBe(false);
  });

  it("종료 경계: 해제 시각부터 벗어나고, 직전(중복 시간대)은 아직 속한다", () => {
    expect(inDst(at("1948-09-13T00:00"))).toBe(false);
    expect(inDst(at("1948-09-12T23:30"))).toBe(true);
    expect(inDst(at("1960-09-18T00:00"))).toBe(false);
    expect(inDst(at("1960-09-17T23:30"))).toBe(true);
    expect(inDst(at("1988-10-09T03:00"))).toBe(false);
  });

  it("연도별 상이한 시행일이 반영된다 (5월 첫 일요일 규칙 1957~60)", () => {
    expect(inDst(at("1958-05-04T00:30"))).toBe(true); // 1958: 5/4
    expect(inDst(at("1959-05-03T00:30"))).toBe(true); // 1959: 5/3
    expect(inDst(at("1959-05-02T12:00"))).toBe(false); // 전날은 아직 아님
    expect(inDst(at("1960-05-01T00:30"))).toBe(true); // 1960: 5/1
  });

  it("미시행 연도는 속하지 않는다 (1952~54 중단기, 1961 이후, 1990+)", () => {
    for (const s of ["1952-07-01T12:00", "1954-07-01T12:00", "1961-07-01T12:00", "1990-03-15T08:30"]) {
      expect(inDst(at(s)), s).toBe(false);
    }
  });

  // 회귀 방지: 시간 미상 출생은 00:00으로 들어오는데, −1h 보정을 먼저 적용하면
  // 전날로 밀려 일주가 하루 어긋났다. 날짜는 입력된 출생일 기준이어야 한다.
  it("시간 미상 + DST 구간: 일주가 입력한 출생일 기준으로 계산된다", () => {
    for (const date of ["1948-06-01", "1987-07-15"]) {
      const unknown = computePillars(at(`${date}T00:00`), { timeUnknown: true });
      const knownNoon = computePillars(at(`${date}T12:00`), { timeUnknown: false });
      expect(unknown.day, `${date} 일주`).toEqual(knownNoon.day);
      expect(unknown.year, `${date} 년주`).toEqual(knownNoon.year);
      expect(unknown.month, `${date} 월주`).toEqual(knownNoon.month);
    }
  });
});
