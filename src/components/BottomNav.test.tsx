import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";
import { sessionStore } from "@/lib/session-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("하단 탭바 (4탭 IA 스펙 §2)", () => {
  it("4탭 — 홈·오늘의운세·사주팔자·유명인궁합", () => {
    render(<BottomNav />);
    const pairs: [string, string][] = [
      ["홈", "/"], ["오늘의운세", "/today"], ["사주팔자", "/saju"], ["유명인궁합", "/celeb"],
    ];
    for (const [label, href] of pairs) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
  });

  // 보관함은 탭 자리만 내주고 라우트는 살아 있다 — 탭바에서만 사라졌는지 확인.
  it("보관함 탭은 더 이상 없다", () => {
    render(<BottomNav />);
    expect(screen.queryByRole("link", { name: /보관함/ })).toBeNull();
  });

  it("현재 경로의 탭이 활성 스타일을 갖는다", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /오늘의운세/ })).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: /^홈/ })).not.toHaveClass("font-semibold");
  });

  it("탭을 누르면 세션 입력 저장소를 비운다(새 탭이 빈 상태로 시작)", () => {
    sessionStore.setItem("om_onboarding_draft", "{...}");
    render(<BottomNav />);
    fireEvent.click(screen.getByRole("link", { name: /사주팔자/ }));
    expect(sessionStore.getItem("om_onboarding_draft")).toBeNull();
  });
});
