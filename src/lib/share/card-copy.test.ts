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
  profileCardQuery,
  profileCardParams,
  profileCopyFromParams,
  parseProfileCardParams,
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

describe("나의 조각 카드 — profileCardQuery ↔ parseProfileCardParams", () => {
  const sections = [
    { title: "당신을 만나서", body: "달빛님, 여름의 한가운데에서 태어난 당신은 스스로 빛을 내는 기운이 있어요." },
    { title: "타고난 결", body: "사주의 중심이 되는 일간은 '무', 토의 기운을 타고났어요." },
  ];

  it("왕복하면 동일 파라미터", () => {
    const q = profileCardQuery(ctx, "달빛", sections);
    const p = parseProfileCardParams(new URLSearchParams(q));
    expect(p).toEqual({
      dm: ctx.dayMaster.stem,
      el: ctx.dayMaster.element,
      nickname: "달빛",
      sections,
    });
  });

  it("mode=profile이 쿼리에 포함된다", () => {
    expect(profileCardQuery(ctx, "달빛", sections)).toMatch(/(?:^|&)mode=profile(?:&|$)/);
  });

  it("생년월일시가 쿼리에 절대 포함되지 않는다", () => {
    expect(profileCardQuery(ctx, "달빛", sections)).not.toMatch(/1995|08-15|10:30/);
  });

  it("닉네임이 비거나 상한을 넘으면 null", () => {
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", sections));
    sp.set("nickname", "가".repeat(30));
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("sections가 JSON이 아니면 null", () => {
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", sections));
    sp.set("sections", "이건 JSON이 아니에요");
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("sections가 빈 배열이면 null", () => {
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", []));
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("섹션 개수가 상한을 넘으면 null", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ title: `섹션${i}`, body: "본문" }));
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", many));
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("섹션 본문 길이가 상한을 넘으면 null", () => {
    const tooLong = [{ title: "제목", body: "가".repeat(300) }];
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", tooLong));
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("섹션에 title·body가 아닌 필드가 섞이면 null", () => {
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", sections));
    sp.set("sections", JSON.stringify([{ title: "제목" }]));
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("일간↔오행이 불일치하면 null", () => {
    const sp = new URLSearchParams(profileCardQuery(ctx, "달빛", sections));
    sp.set("el", ctx.dayMaster.element === "화" ? "수" : "화");
    expect(parseProfileCardParams(sp)).toBeNull();
  });

  it("profileCopyFromParams는 섹션을 그대로 옮긴다", () => {
    const p = parseProfileCardParams(new URLSearchParams(profileCardQuery(ctx, "달빛", sections)));
    const c = profileCopyFromParams(p!);
    expect(c.nickname).toBe("달빛");
    expect(c.sections).toEqual(sections);
    expect(c.hanja).toHaveLength(2);
  });

  it("고정 카피(cta·slogan)는 톤 가드를 통과한다", () => {
    const c = profileCopyFromParams(profileCardParams(ctx, "달빛", sections));
    expect(checkTone(c.cta)).toEqual([]);
    expect(checkTone(c.slogan)).toEqual([]);
  });
});
