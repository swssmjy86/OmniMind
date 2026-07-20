import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { chatSystemPrompt } from "./chat-prompt";
import { dominantCategory } from "./content/ten-gods";
import type { ChatInput } from "./provider";
import type { TenGodChart } from "@/lib/engine/ten-gods";

const profile = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  gender: "male",
});

const baseInput: ChatInput = {
  profile, nickname: "새벽", history: [], message: "오늘 하루 어때요?",
};

describe("chatSystemPrompt — 페르소나별 말투", () => {
  it("personaId가 없으면 기본 옴니마인드 동반자 목소리(기존 동작, 마음 챗 등)", () => {
    const prompt = chatSystemPrompt(baseInput);
    expect(prompt).toContain("옴니마인드'의 따뜻한 동반자");
    expect(prompt).not.toContain("페르소나");
  });

  it("personaId가 있으면 그 페르소나의 이름·정체성·말투 지시문으로 연다", () => {
    const dalzigi = chatSystemPrompt({ ...baseInput, personaId: "dalzigi" });
    expect(dalzigi).toContain("달지기");
    expect(dalzigi).toContain("문지기");
    expect(dalzigi).toContain("조용하고 다정하게");

    const hongyeon = chatSystemPrompt({ ...baseInput, personaId: "hongyeon" });
    expect(hongyeon).toContain("홍연");
    expect(hongyeon).toContain("반말");

    const geumo = chatSystemPrompt({ ...baseInput, personaId: "geumo" });
    expect(geumo).toContain("금오");
    expect(geumo).toContain("하오체");

    const seoon = chatSystemPrompt({ ...baseInput, personaId: "seoon" });
    expect(seoon).toContain("서온");
    expect(seoon).toContain("사서");
  });

  it("4개 페르소나 전부 + personaId 없음, report/premium/longForm 조합에서도 프롬프트가 예외 없이 만들어진다", () => {
    // checkTone은 LLM '출력'에만 적용되는 필터라 여기선 안 쓴다 — 이 프롬프트는 지시문 안에
    // "'~하세요' 금지"처럼 금지 표현을 예시로 인용하므로 checkTone을 걸면 필터가 자기 자신의
    // 설명문에 걸린다(오탐).
    const personas = ["dalzigi", "seoon", "hongyeon", "geumo", undefined] as const;
    for (const personaId of personas) {
      for (const opts of [{}, { premium: true }, { premium: true, longForm: true }, { report: true }]) {
        const prompt = chatSystemPrompt({ ...baseInput, personaId }, opts);
        expect(prompt.length).toBeGreaterThan(0);
      }
    }
  });

  it("longForm이면 premium의 '4~7문장' 상한 대신 사용자 메시지의 길이 지시를 따르라고 한다", () => {
    const withoutLongForm = chatSystemPrompt(baseInput, { premium: true });
    expect(withoutLongForm).toContain("4~7문장");

    const withLongForm = chatSystemPrompt(baseInput, { premium: true, longForm: true });
    expect(withLongForm).not.toContain("4~7문장");
    expect(withLongForm).toContain("사용자 메시지");
  });

  it("report 모드 지시문은 페르소나 유무와 무관하게 항상 포함된다(구조화 응답 파싱 안정성)", () => {
    for (const personaId of ["hongyeon", undefined] as const) {
      const prompt = chatSystemPrompt({ ...baseInput, personaId }, { report: true });
      expect(prompt).toContain("[성격과 취향]");
    }
  });

  it("report 모드는 월주→활동→일주→대운 4단 서사 순서를 지시한다", () => {
    const prompt = chatSystemPrompt(baseInput, { report: true });
    expect(prompt).toContain("월주(자라온 환경 속에서 다져진 본바탕)");
    expect(prompt).toContain("일주(당신 자신이 마음을 정하는 방식)");
    expect(prompt).toContain("대운의 방향");
    // report가 아니면 이 서사 지시는 섞이지 않는다.
    expect(chatSystemPrompt(baseInput)).not.toContain("대운의 방향");
  });

  it("프로필 맥락(닉네임·일간·사주 네 기둥)은 페르소나 여부와 무관하게 그대로 담긴다", () => {
    const withPersona = chatSystemPrompt({ ...baseInput, personaId: "geumo" });
    const withoutPersona = chatSystemPrompt(baseInput);
    for (const prompt of [withPersona, withoutPersona]) {
      expect(prompt).toContain("새벽");
      expect(prompt).toContain(profile.dayMaster.stem);
      expect(prompt).toContain(profile.pillars.year);
    }
  });
});

describe("chatSystemPrompt — 우세 십성 기반 어조 힌트(P3-10)", () => {
  const TONE_HINTS: Record<string, string> = {
    비겁: "스스로 정하고 싶어 하는 결",
    식상: "표현이 자유로운 결",
    재성: "실속을 살피는 결",
    관성: "원칙과 예의를 소중히 여기는 결",
    인성: "천천히 곱씹는 결",
  };

  function chartOf(g: "비견" | "식신" | "편재" | "정관" | "정인"): TenGodChart {
    return {
      yearStem: g, monthStem: g, hourStem: g,
      yearBranch: g, monthBranch: g, dayBranch: g, hourBranch: g,
    };
  }

  it("우세 십성 5갈래 전부에서 해당 어조 힌트가 프롬프트에 담긴다", () => {
    const gods = ["비견", "식신", "편재", "정관", "정인"] as const;
    for (const g of gods) {
      const ctx = { ...profile, tenGods: chartOf(g) };
      const cat = dominantCategory(ctx.tenGods);
      const prompt = chatSystemPrompt({ ...baseInput, profile: ctx });
      expect(prompt).toContain(TONE_HINTS[cat]);
    }
  });

  it("페르소나 선택과 무관하게 같은 어조 힌트가 붙는다", () => {
    const ctx = { ...profile, tenGods: chartOf("정관") };
    for (const personaId of ["geumo", "hongyeon", undefined] as const) {
      const prompt = chatSystemPrompt({ ...baseInput, profile: ctx, personaId });
      expect(prompt).toContain("원칙과 예의를 소중히 여기는 결");
    }
  });

  it("어조 힌트는 위 말투를 '대체하지 않고 더한다'고 명시해 페르소나 말투와 충돌하지 않는다", () => {
    const prompt = chatSystemPrompt({ ...baseInput, personaId: "geumo" });
    expect(prompt).toContain("위 말투를 대체하지 않고 살짝만 더해요");
  });
});
