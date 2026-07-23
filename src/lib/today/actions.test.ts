import { describe, expect, it, vi } from "vitest";
import { computeGuestDailyExtras } from "./actions";
import { respond } from "@/lib/interpret/interpret";

// LLM 경로는 네트워크라 목으로 — 계산(개인화·띠)은 진짜 엔진으로 검증한다.
vi.mock("@/lib/interpret/interpret", () => ({ respond: vi.fn() }));

describe("computeGuestDailyExtras — 비로그인 오늘의운세 개인화(블러 해제)", () => {
  it("생년월일만으로 일간 개인화·띠 관계를 내고, LLM 성공 시 이야기까지 담는다", async () => {
    vi.mocked(respond).mockResolvedValue({ source: "llm", text: "달빛이 다듬은 문장." });
    const extras = await computeGuestDailyExtras("1995-08-20", "");
    expect(extras).not.toBeNull();
    expect(extras!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(extras!.personal!.length).toBeGreaterThan(0);
    expect(extras!.zodiac!.animal.length).toBeGreaterThan(0); // 년지 → 띠
    expect(extras!.story).toBe("달빛이 다듬은 문장.");
  });

  it("LLM 실패(템플릿 폴백)면 story만 null — 나머지 개인화는 그대로", async () => {
    vi.mocked(respond).mockResolvedValue({ source: "template", text: "" });
    const extras = await computeGuestDailyExtras("1995-08-20", "23:30");
    expect(extras).not.toBeNull();
    expect(extras!.personal!.length).toBeGreaterThan(0);
    expect(extras!.zodiac).not.toBeNull();
    expect(extras!.story).toBeNull();
  });

  it("잘못된 입력이면 null — 화면은 공통 문구로 대체된다", async () => {
    vi.mocked(respond).mockResolvedValue({ source: "template", text: "" });
    expect(await computeGuestDailyExtras("1995/08/20", "")).toBeNull();
    expect(await computeGuestDailyExtras("1995-08-20", "99:99")).toBeNull();
  });
});
