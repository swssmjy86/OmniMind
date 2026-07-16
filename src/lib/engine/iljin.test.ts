import { describe, expect, it } from "vitest";
import { dayPillar } from "./pillars";
import { kstStringToInstant } from "./kst";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./constants";
import { ILJIN_CASES } from "./fixtures/iljin-cases";

// 일주 앵커(2000-01-07=갑자일)와 달력 산술의 외부 검증 — KASI 공표 일진 467건(1900~2050).
// CLAUDE.md가 이 앵커를 "유일한 외부 가정"이라 부르던 근거를 없애는 코퍼스다.
// 네트워크 없이 돌고, 앵커가 한 칸이라도 밀리면 467건이 전부 실패한다.
// 갱신: KASI_SERVICE_KEY=... npx tsx scripts/verify-iljin.ts 1900 2050 --emit-fixture

/** 달력상 그날의 일진 — 정오로 물어 야자시(23시) 이월 규칙을 피한다. */
const iljinOf = (date: string): string => {
  const p = dayPillar(kstStringToInstant(`${date}T12:00`));
  return HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch];
};

describe("일주 × KASI 공표 일진 (외부 대조)", () => {
  it(`1900~2050년 ${ILJIN_CASES.length}개 날짜의 일진이 KASI 공표값과 일치한다`, () => {
    const off = ILJIN_CASES.filter(([date, expected]) => iljinOf(date) !== expected).map(
      ([date, expected]) => `${date}: 엔진 ${iljinOf(date)} vs KASI ${expected}`,
    );
    expect(off, `KASI 일진과 불일치:\n${off.slice(0, 20).join("\n")}`).toEqual([]);
  });

  it("앵커 당일: 2000-01-07 = 갑자일", () => {
    expect(iljinOf("2000-01-07")).toBe("갑자");
  });

  it("1900년은 윤년이 아니다 — 2/28 다음 날이 3/1이고 일진이 연달아 간다", () => {
    expect(iljinOf("1900-02-28")).toBe("임신");
    expect(iljinOf("1900-03-01")).toBe("계유"); // 임신 → 계유: 60갑자에서 바로 다음
  });

  it("2000년은 윤년이다(400년 예외) — 2/29가 존재하고 일진이 이어진다", () => {
    expect(iljinOf("2000-02-28")).toBe("병진");
    expect(iljinOf("2000-02-29")).toBe("정사");
    expect(iljinOf("2000-03-01")).toBe("무오");
  });
});
