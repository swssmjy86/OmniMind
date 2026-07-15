import { describe, expect, it } from "vitest";
import { applyDst, DST_PERIODS } from "./dst";
import { kstStringToInstant } from "./kst";

const at = (s: string) => kstStringToInstant(s);
const minus1h = (s: string) => new Date(at(s).getTime() - 3600_000);

// 1948~1960 구간은 IANA tzdata(Rule ROK)·국가기록원 기록 기준.
// 경계 규약: 시작 시각부터 적용(>= start), 종료 시각 직전까지 적용(< end).
// 종료 직전 1시간(시계를 되돌려 두 번 존재하는 벽시계)은 서머타임 쪽으로 해석한다 — 1987/88과 동일.
describe("applyDst — 한국 서머타임 보정", () => {
  it("시행 연도 10개(1948~51, 1955~60)가 모두 등록되어 있다", () => {
    const years = DST_PERIODS.map((p) => Number(p.start.slice(0, 4)));
    for (const y of [1948, 1949, 1950, 1951, 1955, 1956, 1957, 1958, 1959, 1960, 1987, 1988]) {
      expect(years).toContain(y);
    }
  });

  it("구간 한복판 출생은 −1h 보정된다", () => {
    expect(applyDst(at("1948-08-15T12:00"))).toEqual(minus1h("1948-08-15T12:00"));
    expect(applyDst(at("1956-07-01T06:30"))).toEqual(minus1h("1956-07-01T06:30"));
    expect(applyDst(at("1960-08-15T00:30"))).toEqual(minus1h("1960-08-15T00:30"));
  });

  it("시작 경계: 시행 시각 정각부터 보정, 직전은 무보정", () => {
    expect(applyDst(at("1948-06-01T00:00"))).toEqual(minus1h("1948-06-01T00:00"));
    expect(applyDst(at("1948-05-31T23:59"))).toEqual(at("1948-05-31T23:59"));
    expect(applyDst(at("1957-05-05T00:00"))).toEqual(minus1h("1957-05-05T00:00"));
    expect(applyDst(at("1957-05-04T23:59"))).toEqual(at("1957-05-04T23:59"));
  });

  it("종료 경계: 해제 시각부터 무보정, 직전(중복 시간대)은 보정", () => {
    expect(applyDst(at("1948-09-13T00:00"))).toEqual(at("1948-09-13T00:00"));
    expect(applyDst(at("1948-09-12T23:30"))).toEqual(minus1h("1948-09-12T23:30"));
    expect(applyDst(at("1960-09-18T00:00"))).toEqual(at("1960-09-18T00:00"));
    expect(applyDst(at("1960-09-17T23:30"))).toEqual(minus1h("1960-09-17T23:30"));
  });

  it("연도별 상이한 시행일이 반영된다 (5월 첫 일요일 규칙 1957~60)", () => {
    expect(applyDst(at("1958-05-04T00:30"))).toEqual(minus1h("1958-05-04T00:30")); // 1958: 5/4
    expect(applyDst(at("1959-05-03T00:30"))).toEqual(minus1h("1959-05-03T00:30")); // 1959: 5/3
    expect(applyDst(at("1959-05-02T12:00"))).toEqual(at("1959-05-02T12:00")); // 전날은 무보정
    expect(applyDst(at("1960-05-01T00:30"))).toEqual(minus1h("1960-05-01T00:30")); // 1960: 5/1
  });

  it("미시행 연도는 그대로 둔다 (1952~54 중단기, 1961 이후, 1990+)", () => {
    for (const s of ["1952-07-01T12:00", "1954-07-01T12:00", "1961-07-01T12:00", "1990-03-15T08:30"]) {
      expect(applyDst(at(s))).toEqual(at(s));
    }
  });

  it("기존 1987/88 구간은 변함없이 동작한다", () => {
    expect(applyDst(at("1987-07-01T12:00"))).toEqual(minus1h("1987-07-01T12:00"));
    expect(applyDst(at("1988-10-09T03:00"))).toEqual(at("1988-10-09T03:00"));
  });
});
