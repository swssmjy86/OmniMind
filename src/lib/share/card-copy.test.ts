import { describe, it, expect } from "vitest";
import { computeProfile } from "@/lib/engine";
import { checkTone } from "@/lib/interpret/tone-guard";
import {
  COMBO_COUNT,
  cardCopy,
  cardQuery,
  copyFromParams,
  parseCardParams,
} from "./card-copy";

const ctx = computeProfile({
  birthDate: "1995-08-15",
  birthTime: "10:30",
  timeUnknown: false,
  bloodType: "O",
  mbti: "ENFJ",
});

describe("cardCopy", () => {
  it("프로필 컨텍스트에서 카피를 만든다", () => {
    const c = cardCopy(ctx);
    expect(c.line1).toBe(`${ctx.dayMaster.stem}${ctx.dayMaster.element}(${c.hanja})의 ENFJ`);
    expect(c.line2).toBe("사자자리 · O형");
    expect(c.hook).toContain("1,920");
    expect(c.hanja).toHaveLength(2);
  });

  it("혈액형이 없으면 line2에서 생략한다", () => {
    const c = copyFromParams({ dm: "갑", el: "목", mbti: "INFP", zo: "게자리", blood: null });
    expect(c.line2).toBe("게자리");
  });

  it("조합 수는 1,920 (일간10×MBTI16×별자리12)", () => {
    expect(COMBO_COUNT).toBe(1920);
  });

  it("모든 카피가 톤 가드를 통과한다", () => {
    const c = cardCopy(ctx);
    for (const text of [c.line1, c.line2, c.hook, c.slogan]) {
      expect(checkTone(text)).toEqual([]);
    }
  });
});

describe("cardQuery ↔ parseCardParams 왕복", () => {
  it("쿼리 생성 후 파싱하면 동일 파라미터", () => {
    const sp = new URLSearchParams(cardQuery(ctx));
    const p = parseCardParams(sp);
    expect(p).toEqual({
      dm: ctx.dayMaster.stem,
      el: ctx.dayMaster.element,
      mbti: "ENFJ",
      zo: "사자자리",
      blood: "O",
    });
  });

  it("쿼리에 생년월일시가 절대 포함되지 않는다", () => {
    const q = cardQuery(ctx);
    expect(q).not.toMatch(/1995|08-15|10:30/);
  });
});

describe("parseCardParams 검증", () => {
  const valid = "dm=갑&el=목&mbti=ENFJ&zo=사자자리&blood=O";

  it("유효한 쿼리를 파싱한다", () => {
    expect(parseCardParams(new URLSearchParams(valid))).toEqual({
      dm: "갑", el: "목", mbti: "ENFJ", zo: "사자자리", blood: "O",
    });
  });

  it("blood 없이도 유효하다", () => {
    const p = parseCardParams(new URLSearchParams("dm=계&el=수&mbti=ISTP&zo=물병자리"));
    expect(p).toEqual({ dm: "계", el: "수", mbti: "ISTP", zo: "물병자리", blood: null });
  });

  it.each([
    ["없는 천간", "dm=강&el=목&mbti=ENFJ&zo=사자자리"],
    ["천간·오행 불일치", "dm=갑&el=화&mbti=ENFJ&zo=사자자리"],
    ["없는 MBTI", "dm=갑&el=목&mbti=ABCD&zo=사자자리"],
    ["없는 별자리", "dm=갑&el=목&mbti=ENFJ&zo=용자리"],
    ["없는 혈액형", "dm=갑&el=목&mbti=ENFJ&zo=사자자리&blood=C"],
    ["파라미터 누락", "mbti=ENFJ&zo=사자자리"],
  ])("%s → null", (_label, q) => {
    expect(parseCardParams(new URLSearchParams(q))).toBeNull();
  });
});
