import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TodayTeaser from "./TodayTeaser";

describe("블러 티저 (스펙 §3 — 개인화부터 잠금)", () => {
  it("잠긴 카드 3장 제목과 로그인 CTA를 렌더한다", () => {
    render(<TodayTeaser />);
    expect(screen.getByText("내 일간으로 본 오늘")).toBeInTheDocument();
    expect(screen.getByText("내 띠와 오늘")).toBeInTheDocument();
    expect(screen.getByText("AI가 다듬은 오늘의 이야기")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인하고 모두 열어보기/ })).toHaveAttribute("href", "/login");
  });

  it("잠긴 본문은 DOM에 없다 — 자리표시자는 aria-hidden 장식뿐 (P9 §5.1)", () => {
    const { container } = render(<TodayTeaser />);
    // 개인화 문구의 흔적(십성·관계 문장 등)이 텍스트로 존재하지 않는다
    expect(container.textContent).not.toMatch(/기운이에요|날이에요|육합|삼합/);
    // 자리표시자 막대는 전부 aria-hidden
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
