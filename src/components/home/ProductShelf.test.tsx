import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductShelf from "./ProductShelf";

describe("ProductShelf (§4.4 홈 상품 목록 — 일진 포함 5장)", () => {
  it("오늘의 일진이 맨 위, 총 5장 순서대로 렌더된다", () => {
    render(<ProductShelf />);
    const titles = ["오늘의 일진", "내 사주 심층 풀이", "궁합 심층", "인연 풀이", "재물 풀이"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
  });

  it("live 상품 링크: 일진 → /daily가 첫 번째", () => {
    render(<ProductShelf />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/daily", "/me", "/match"]);
  });
});
