import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { chatSystemPrompt } from "./chat-prompt";
import type { ChatInput } from "./provider";

const profile = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ", gender: "male",
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
