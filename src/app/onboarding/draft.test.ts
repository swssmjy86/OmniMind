import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, loadDraft, clearDraft, isCompleteDraft, type Draft } from "./draft";

const draft: Draft = {
  nickname: "다인",
  birthDate: "1995-08-15",
  birthTime: "10:30",
  timeUnknown: false,
};

describe("onboarding draft", () => {
  beforeEach(() => clearDraft());

  it("저장 → 복원 왕복", () => {
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
  });

  it("없으면 null", () => {
    expect(loadDraft()).toBeNull();
  });

  it("깨진 값·형식 오류는 null", () => {
    localStorage.setItem("om_onboarding_draft", "{broken");
    expect(loadDraft()).toBeNull();
    localStorage.setItem(
      "om_onboarding_draft",
      JSON.stringify({ ...draft, gender: "unknown" }),
    );
    expect(loadDraft()).toBeNull();
  });

  it("보조축(mbti·blood) — 저장 왕복·하위 호환·형식 오류", () => {
    // 필드 없는 구버전 draft도 그대로 읽힌다(하위 호환)
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
    // 새 필드 왕복
    const withTraits: Draft = { ...draft, mbti: "ENFP", blood: "A" };
    saveDraft(withTraits);
    expect(loadDraft()).toEqual(withTraits);
    // 형식 오류는 draft 전체를 버린다(다른 필드와 같은 방어 규칙)
    localStorage.setItem("om_onboarding_draft", JSON.stringify({ ...draft, blood: "C" }));
    expect(loadDraft()).toBeNull();
    localStorage.setItem("om_onboarding_draft", JSON.stringify({ ...draft, mbti: 12 }));
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft로 지운다", () => {
    saveDraft(draft);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("isCompleteDraft — 완주 여부 판정", () => {
    expect(isCompleteDraft(draft)).toBe(true);
    expect(isCompleteDraft({ ...draft, birthDate: "1995-8-15" })).toBe(false);
    expect(isCompleteDraft({ ...draft, birthTime: "", timeUnknown: true })).toBe(true);
  });
});
