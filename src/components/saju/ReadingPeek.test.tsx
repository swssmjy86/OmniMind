import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReadingPeek from "./ReadingPeek";

describe("ReadingPeek (P9 §5.1 — 제목만 공개)", () => {
  it("제목 목록을 잠금 카드로 렌더하고 본문 자리표시자는 aria-hidden", () => {
    const { container } = render(<ReadingPeek titles={["일의 결", "운의 계절"]} />);
    expect(screen.getByText("일의 결")).toBeInTheDocument();
    expect(screen.getByText("운의 계절")).toBeInTheDocument();
    const bars = container.querySelectorAll(".teaser-bar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden");
  });
});
