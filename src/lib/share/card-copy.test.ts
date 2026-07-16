import { describe, it, expect } from "vitest";
import { computeProfile } from "@/lib/engine";
import { checkTone } from "@/lib/interpret/tone-guard";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily } from "@/lib/interpret/content/daily";
import {
  COMBO_COUNT,
  cardCopy,
  cardQuery,
  copyFromParams,
  parseCardParams,
  dailyCardQuery,
  dailyCardParams,
  dailyCopyFromParams,
  parseDailyCardParams,
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

describe("오늘의 나 카드 — dailyCardQuery ↔ parseDailyCardParams", () => {
  const guide = assembleDaily(computeDaily({ y: 2026, mo: 7, d: 16 }, ctx.dayMaster.element, ctx.dayMaster.stem), "달빛");

  it("왕복하면 동일 파라미터", () => {
    const q = dailyCardQuery(ctx, guide);
    const p = parseDailyCardParams(new URLSearchParams(q));
    expect(p).toEqual({
      dm: ctx.dayMaster.stem,
      el: ctx.dayMaster.element,
      headline: guide.headline,
      mind: guide.mind,
      personal: guide.personal,
      color: guide.color,
      keyword: guide.keyword,
      lucky: guide.lucky,
    });
  });

  it("mode=daily가 쿼리에 포함된다", () => {
    expect(dailyCardQuery(ctx, guide)).toMatch(/(?:^|&)mode=daily(?:&|$)/);
  });

  it("생년월일시가 쿼리에 절대 포함되지 않는다", () => {
    expect(dailyCardQuery(ctx, guide)).not.toMatch(/1995|08-15|10:30/);
  });

  it("personal이 없으면 파라미터에서 생략되고 파싱 결과도 null", () => {
    const noPersonal = { ...guide, personal: null };
    const p = parseDailyCardParams(new URLSearchParams(dailyCardQuery(ctx, noPersonal)));
    expect(p?.personal).toBeNull();
  });

  it("필드 하나라도 비면 null", () => {
    const q = dailyCardQuery(ctx, guide);
    const sp = new URLSearchParams(q);
    sp.delete("mind");
    expect(parseDailyCardParams(sp)).toBeNull();
  });

  it("일간↔오행이 불일치하면 null", () => {
    const sp = new URLSearchParams(dailyCardQuery(ctx, guide));
    sp.set("el", "화" === ctx.dayMaster.element ? "수" : "화");
    expect(parseDailyCardParams(sp)).toBeNull();
  });

  it("필드 길이가 상한을 넘으면 null", () => {
    const tooLong = { ...guide, mind: "가".repeat(200) };
    const p = parseDailyCardParams(new URLSearchParams(dailyCardQuery(ctx, tooLong)));
    expect(p).toBeNull();
  });

  it("dailyCopyFromParams는 모든 필드를 카드 카피로 옮긴다", () => {
    const p = parseDailyCardParams(new URLSearchParams(dailyCardQuery(ctx, guide)));
    const c = dailyCopyFromParams(p!);
    expect(c.headline).toBe(guide.headline);
    expect(c.mind).toBe(guide.mind);
    expect(c.personal).toBe(guide.personal);
    expect(c.hanja).toHaveLength(2);
  });

  it("고정 카피(cta·slogan)는 톤 가드를 통과한다", () => {
    const c = dailyCopyFromParams(dailyCardParams(ctx, guide));
    expect(checkTone(c.cta)).toEqual([]);
    expect(checkTone(c.slogan)).toEqual([]);
  });
});
