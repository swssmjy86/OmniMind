import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./Footer";

describe("전역 푸터 (§9.1)", () => {
  it("5개 링크 — 문의·약관·개인정보·출처·Q&A", () => {
    render(<Footer />);
    const pairs: [string, string][] = [
      ["문의하기", "/contact"],
      ["이용약관", "/terms"],
      ["개인정보처리방침", "/privacy"],
      ["출처", "/sources"],
      ["Q&A", "/faq"],
    ];
    for (const [label, href] of pairs) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("면책 한 줄이 있고, 사업자 정보는 없다(개발 단계 §9.1)", () => {
    render(<Footer />);
    expect(screen.getByText(/참고용이에요/)).toBeInTheDocument();
    expect(screen.queryByText(/사업자/)).not.toBeInTheDocument();
    expect(screen.queryByText(/대표/)).not.toBeInTheDocument();
  });
});
