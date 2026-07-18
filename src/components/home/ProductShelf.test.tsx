import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProductShelf from "./ProductShelf";

describe("ProductShelf (§4.4 홈 상품 목록)", () => {
  it("일진을 제외한 4장 — 내 사주 심층·궁합 심층·인연·재물 순서로 렌더된다", () => {
    render(<ProductShelf />);
    expect(screen.queryByText("오늘의 일진")).not.toBeInTheDocument(); // 상단 무료 훅이 담당
    const titles = ["내 사주 심층 풀이", "궁합 심층", "인연 풀이", "재물 풀이"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
  });

  it("live 상품은 링크, soon 상품은 링크가 아니다", () => {
    render(<ProductShelf />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/me", "/match"]);
  });
});
