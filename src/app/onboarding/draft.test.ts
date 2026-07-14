import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, loadDraft, clearDraft, isCompleteDraft, type Draft } from "./draft";

const draft: Draft = {
  nickname: "다인",
  birthDate: "1995-08-15",
  birthTime: "10:30",
  timeUnknown: false,
  bloodType: "O",
  mbti: "ENFJ",
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
      JSON.stringify({ ...draft, mbti: "ABCD" }),
    );
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft로 지운다", () => {
    saveDraft(draft);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("isCompleteDraft — 완주 여부 판정", () => {
    expect(isCompleteDraft(draft)).toBe(true);
    expect(isCompleteDraft({ ...draft, mbti: null })).toBe(false);
    expect(isCompleteDraft({ ...draft, birthDate: "1995-8-15" })).toBe(false);
    expect(isCompleteDraft({ ...draft, birthTime: "", timeUnknown: true })).toBe(true);
  });
});
