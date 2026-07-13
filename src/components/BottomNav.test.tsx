import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import BottomNav from "./BottomNav";

const mockPathname = vi.hoisted(() => vi.fn(() => "/"));
vi.mock("next/navigation", () => ({ usePathname: mockPathname }));

describe("BottomNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("4개 탭(홈/나/고민/마음)을 렌더한다", () => {
    render(<BottomNav />);
    for (const label of ["홈", "나", "고민", "마음"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("현재 경로의 탭을 딥 그린으로 강조한다", () => {
    mockPathname.mockReturnValue("/me");
    render(<BottomNav />);
    expect(screen.getByText("나").closest("a")).toHaveClass("text-primary-green");
    expect(screen.getByText("홈").closest("a")).toHaveClass("text-text-soft");
  });
});
