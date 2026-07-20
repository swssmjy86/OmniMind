import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { synthesisText, profileSynthesisPrompt, parseReportSections } from "./synthesis";
import { DAY_MASTER_TEXT } from "./day-master";
import { ZODIAC_TEXT } from "./zodiac";
import { checkTone } from "../tone-guard";
import { chatSystemPrompt } from "../chat-prompt";
import type { ProfileContext } from "@/lib/engine";
import type { DayMasterStrength } from "@/lib/engine/strength";
import type { TenGodChart } from "@/lib/engine/ten-gods";
import type { ChatInput } from "../provider";

// 십성 5갈래 × 신강/신약/중화 3단 = 15개 교차 문구의 완전성·톤을 검사한다.
const gods = ["비견", "식신", "편재", "정관", "정인"] as const;
const STRENGTHS = ["신강", "신약", "중화"] as const;

const base = computeProfile({
  birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
});

function withChart(g: (typeof gods)[number], strength: DayMasterStrength): ProfileContext {
  const chart: TenGodChart = {
    yearStem: g, monthStem: g, hourStem: g,
    yearBranch: g, monthBranch: g, dayBranch: g, hourBranch: g,
  };
  return { ...base, tenGods: chart, strength };
}

describe("synthesisText — 사주 안 십성×신강신약 교차(조각이 만나는 자리)", () => {
  it("15개 조합 전부 문구 존재·서로 다름·톤 통과", () => {
    const seen = new Set<string>();
    for (const g of gods) {
      for (const s of STRENGTHS) {
        const t = synthesisText(withChart(g, s));
        expect(t.length).toBeGreaterThan(0);
        expect(checkTone(t)).toHaveLength(0);
        seen.add(t);
      }
    }
    expect(seen.size).toBe(15);
  });

  it("신강/신약이 다르면 같은 십성이라도 다른 이야기", () => {
    expect(synthesisText(withChart("식신", "신강"))).not.toBe(synthesisText(withChart("식신", "신약")));
  });
});

describe("profileSynthesisPrompt — P8 로그인 전용 심층 리포트(사주+별자리 전체 서술 혼합)", () => {
  it("유형 라벨만이 아니라 각 체계에 이미 정의된 전체 서술을 그대로 담는다", () => {
    const prompt = profileSynthesisPrompt(base, "다인");
    expect(prompt).toContain(DAY_MASTER_TEXT[base.dayMaster.stem].body);
    expect(prompt).toContain(ZODIAC_TEXT[base.zodiac].intro);
    expect(prompt).toContain(base.strength);
    expect(prompt).toContain("다인");
  });

  it("결들을 나열하지 말고 한 사람의 이야기로 엮으라고 명시한다", () => {
    const prompt = profileSynthesisPrompt(base, "다인");
    expect(prompt).toContain("나열하지 말고 한 사람의 이야기로 엮어");
  });

  it("월주(본바탕)→활동→일주(결정 방식)→대운(생애 흐름) 4단 서사 순서를 실제 월주 간지로 명시한다", () => {
    const prompt = profileSynthesisPrompt(base, "다인");
    expect(prompt).toContain(`월주(${base.pillars.month}, 자라온 환경 속 본바탕)`);
    expect(prompt).toContain("일주(당신 자신이 마음을 정하는 방식)");
    expect(prompt).toContain("대운의 방향(생애 흐름)");
  });
});

describe("chatSystemPrompt report 모드 — 성격·색·현재/미래·4대운 구조 지시", () => {
  const input: ChatInput = { profile: base, nickname: "다인", history: [], message: "" };

  it("성격과 취향·색·현재와 앞으로·연애운·사업운·관계운·금전운 순서를 전부 지시한다", () => {
    const prompt = chatSystemPrompt(input, { report: true });
    for (const title of ["성격과 취향", "당신의 색", "지금과 앞으로", "연애운", "사업운·커리어", "관계운", "금전운"]) {
      expect(prompt).toContain(`[${title}]`);
    }
  });

  it("옴니마인드 가치(따뜻한 발견과 공감, 단정적 점술 아님)를 명시한다", () => {
    const prompt = chatSystemPrompt(input, { report: true });
    expect(prompt).toContain("따뜻한 발견과 공감");
    expect(prompt).toContain("점술이 아니에요");
  });

  it("report가 아니면(챗) 리포트 형식 지시가 섞이지 않는다", () => {
    const prompt = chatSystemPrompt(input);
    expect(prompt).not.toContain("[성격과 취향]");
  });
});

describe("parseReportSections — 대괄호 제목 리포트 파싱", () => {
  it("여러 [제목] 블록을 각각의 섹션으로 분리한다", () => {
    const text = [
      "[성격과 취향]",
      "따뜻하고 섬세한 결이 있어요.",
      "",
      "[당신의 색]",
      "짙은 초록빛이 어울려요.",
      "",
      "[연애운]",
      "천천히 다가오는 인연이 좋아요.",
    ].join("\n");
    const sections = parseReportSections(text, "폴백");
    expect(sections).toEqual([
      { title: "성격과 취향", body: "따뜻하고 섬세한 결이 있어요." },
      { title: "당신의 색", body: "짙은 초록빛이 어울려요." },
      { title: "연애운", body: "천천히 다가오는 인연이 좋아요." },
    ]);
  });

  it("대괄호 제목이 하나도 없으면 전체를 폴백 제목의 한 섹션으로 담는다", () => {
    const sections = parseReportSections("형식을 따르지 않은 그냥 긴 글이에요.", "당신의 이야기, 더 깊이");
    expect(sections).toEqual([
      { title: "당신의 이야기, 더 깊이", body: "형식을 따르지 않은 그냥 긴 글이에요." },
    ]);
  });

  it("제목만 있고 본문이 비어 있는 블록은 건너뛴다", () => {
    const text = "[빈 제목]\n\n[연애운]\n좋은 인연이 곧 다가와요.";
    const sections = parseReportSections(text, "폴백");
    expect(sections).toEqual([{ title: "연애운", body: "좋은 인연이 곧 다가와요." }]);
  });
});
