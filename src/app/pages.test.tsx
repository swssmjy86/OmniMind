import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./(tabs)/page";
import ConcernPage from "./(tabs)/concern/page";
import MindPage from "./(tabs)/mind/page";

describe("탭 페이지 렌더", () => {
  it.each([
    [HomePage, "오늘의 이야기"],
    [ConcernPage, "고민"],
    [MindPage, "마음"],
  ])("페이지가 제목을 렌더한다: %#", (Page, heading) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });
});
