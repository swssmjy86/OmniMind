import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SajuPage from "./page";

describe("사주팔자 탭 (스펙 §4)", () => {
  it("6종 풀이가 순서대로 — today는 없다", () => {
    render(<SajuPage />);
    const titles = ["총운", "직업운", "연애운", "재물운", "궁합", "결혼운"];
    const rendered = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(rendered).toEqual(titles);
    expect(screen.queryByText("오늘의운세")).not.toBeInTheDocument();
  });

  it("live 링크는 총운=/saju/chongun, 궁합=/match 뿐 — 나머지는 준비 중", () => {
    render(<SajuPage />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/saju/chongun", "/match"]);
    expect(screen.getAllByText("곧 만나요")).toHaveLength(4);
  });
});
