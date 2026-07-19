import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReviewHighlights from "./ReviewHighlights";

describe("ReviewHighlights (4단계 스펙 §3)", () => {
  it("summary null → 아무것도 렌더하지 않는다", () => {
    const { container } = render(<ReviewHighlights summary={null} heading="고객리뷰" />);
    expect(container.firstChild).toBeNull();
  });

  it("평균·개수·코멘트를 익명으로 렌더한다", () => {
    render(
      <ReviewHighlights
        heading="고객리뷰"
        sub="실제로 풀이를 열어본 분들의 이야기예요."
        summary={{
          count: 12, avg: 4.5,
          comments: [{ comment: "따뜻했어요", date: "2026-07-19" }],
        }}
      />,
    );
    expect(screen.getByText("고객리뷰")).toBeInTheDocument();
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/후기 12개/)).toBeInTheDocument();
    expect(screen.getByText("따뜻했어요")).toBeInTheDocument();
    expect(screen.getByText("2026-07-19")).toBeInTheDocument();
  });
});
