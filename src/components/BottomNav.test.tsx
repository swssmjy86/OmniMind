import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/today" }));

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
});
