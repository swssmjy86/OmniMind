import { describe, expect, it } from "vitest";
import {
  yearPillar, monthPillar, dayPillar, hourPillar, hourBranchIndex, computePillars,
} from "./pillars";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./constants";
import { kstStringToInstant, toKstParts } from "./kst";

const gz = (p: { stem: number; branch: number }) =>
  HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch];
const at = (s: string) => kstStringToInstant(s);

describe("년주 (절기 기준)", () => {
  it("1984 여름 → 갑자년", () => {
    expect(gz(yearPillar(at("1984-06-15T12:00")))).toBe("갑자");
  });
  it("입춘 전 출생은 전년 년주 (2000-01-20 → 기묘=1999)", () => {
    expect(gz(yearPillar(at("2000-01-20T12:00")))).toBe("기묘");
  });
  it("2024 여름 → 갑진년", () => {
    expect(gz(yearPillar(at("2024-06-15T12:00")))).toBe("갑진");
  });
});

describe("월주 (오호둔)", () => {
  it("갑술년 인월 = 병인월 (갑기년 인월=병인)", () => {
    const p = monthPillar(at("1994-02-10T12:00")); // 갑술년, 입춘 후 인월
    expect(EARTHLY_BRANCHES[p.branch]).toBe("인");
    expect(HEAVENLY_STEMS[p.stem]).toBe("병");
  });
  it("무계년 인월 = 갑인월", () => {
    // 무진년(1988) 입춘 후 인월 → 갑인
    const p = monthPillar(at("1988-02-10T12:00"));
    expect(gz(p)).toBe("갑인");
  });
});

describe("일주 (JDN 앵커)", () => {
  it("앵커: 2000-01-07 = 갑자일", () => {
    expect(gz(dayPillar(at("2000-01-07T08:00")))).toBe("갑자");
  });
  it("갑자 다음날 = 을축", () => {
    expect(gz(dayPillar(at("2000-01-08T08:00")))).toBe("을축");
  });
  it("60일 순환: 앵커+60일 = 다시 갑자", () => {
    expect(gz(dayPillar(at("2000-03-07T08:00")))).toBe("갑자");
  });
  it("야자시 경계: 22:59와 23:01은 일주가 하루 다르다", () => {
    const a = dayPillar(at("2000-01-07T22:59"));
    const b = dayPillar(at("2000-01-07T23:01"));
    expect(gz(a)).toBe("갑자");
    expect(gz(b)).toBe("을축"); // 다음날로 넘어감
  });
});

describe("시지·시주 (오서둔)", () => {
  it("시지 블록: 23·0=자, 1=축, 12=오, 22=해", () => {
    expect(hourBranchIndex(23)).toBe(0);
    expect(hourBranchIndex(0)).toBe(0);
    expect(hourBranchIndex(1)).toBe(1);
    expect(hourBranchIndex(12)).toBe(6);
    expect(hourBranchIndex(22)).toBe(11);
  });
  it("갑자일 자시(00:30) = 갑자시 (갑기일 자시=갑자)", () => {
    expect(gz(hourPillar(at("2000-01-07T00:30")))).toBe("갑자");
  });
  it("갑자일 오시(12:30) = 경오시", () => {
    // 자시 갑(0)부터 오(6)까지 +6 → 경(6)오
    expect(gz(hourPillar(at("2000-01-07T12:30")))).toBe("경오");
  });
});

describe("computePillars 통합", () => {
  it("출생시간 미상: hour=null, 3주는 산출", () => {
    const fp = computePillars(at("1995-08-20T00:00"), { timeUnknown: true });
    expect(fp.hour).toBeNull();
    expect(fp.year).toBeDefined();
    expect(fp.month).toBeDefined();
    expect(fp.day).toBeDefined();
  });
  it("시간 있으면 4주 모두 산출", () => {
    const fp = computePillars(at("1995-08-20T14:30"), { timeUnknown: false });
    expect(fp.hour).not.toBeNull();
  });
  it("UTC 런타임 가정: KST 자정 직후도 날짜가 밀리지 않는다", () => {
    // 2000-01-07 00:30 KST = 1999-01-06 15:30 UTC. KST 파트로 읽어야 일주 갑자.
    const fp = computePillars(at("2000-01-07T00:30"), { timeUnknown: false });
    expect(gz(fp.day)).toBe("갑자");
    expect(toKstParts(at("2000-01-07T00:30")).d).toBe(7);
  });
});
