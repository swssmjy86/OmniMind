import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChongunPeek from "./ChongunPeek";

describe("총운 엿보기 (2단계 스펙 §5 — lockReason login)", () => {
  it("잠긴 섹션 4장 제목과 로그인 CTA를 렌더한다", () => {
    render(<ChongunPeek />);
    for (const title of ["타고난 그릇", "오행의 풍경", "재능의 흐름", "운의 계절"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /로그인하고 무료로 열람/ })).toHaveAttribute("href", "/login");
  });

  it("본문은 DOM에 없다 — 자리표시자는 aria-hidden 장식뿐(P9 §5.1)", () => {
    const { container } = render(<ChongunPeek />);
    expect(container.textContent).not.toMatch(/기운이에요|면이 있어요|대운을 지나고/);
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
