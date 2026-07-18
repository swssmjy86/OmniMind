import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SourcesPage from "./sources/page";

// /sources /faq /terms /privacy 는 세션을 읽지 않는 동기 서버 컴포넌트라 직접 렌더한다
// (pages.test.tsx의 async 페이지 제외 원칙과 일관).
describe("/sources (§7 출처)", () => {
  it("검증 가능한 계산 근거 — USNO·KASI 대조를 명시한다", () => {
    render(<SourcesPage />);
    expect(screen.getByRole("heading", { level: 1, name: /풀이의 근거/ })).toBeInTheDocument();
    expect(screen.getByText(/USNO/)).toBeInTheDocument();
    expect(screen.getByText(/한국천문연구원/)).toBeInTheDocument();
    expect(screen.getByText(/467건/)).toBeInTheDocument();
  });

  it("AI 고지 — 계산에 AI가 관여하지 않음을 밝힌다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/계산에는 AI가 관여하지 않아요/)).toBeInTheDocument();
  });

  it("해석의 한계를 정직하게 고지한다 — 문장은 옴니마인드가 쓴다", () => {
    render(<SourcesPage />);
    expect(screen.getByText(/문장은 옴니마인드가 써요/)).toBeInTheDocument();
  });
});
