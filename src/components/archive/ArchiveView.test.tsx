import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArchiveView from "./ArchiveView";

describe("보관함 (스펙 §5)", () => {
  it("비로그인 — 로그인 게이트만 보여준다", () => {
    render(<ArchiveView loggedIn={false} entries={[]} />);
    expect(screen.getByText(/기록을 남기고 다시 보려면/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인하고 시작하기/ })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("오늘의운세 기록")).not.toBeInTheDocument();
  });

  it("로그인 — 기록 목록과 마음·고민 진입을 보여준다", () => {
    render(
      <ArchiveView
        loggedIn
        entries={[{ id: "1", date: "2026-07-18", headline: "오늘은 화(병오)의 기운이 흐르는 날이에요." }]}
      />,
    );
    expect(screen.getByText("오늘의운세 기록")).toBeInTheDocument();
    expect(screen.getByText("2026-07-18")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /마음 대화/ })).toHaveAttribute("href", "/mind");
    expect(screen.getByRole("link", { name: /고민 기록/ })).toHaveAttribute("href", "/concern");
  });

  it("로그인 + 기록 0건 — 빈 상태 안내", () => {
    render(<ArchiveView loggedIn entries={[]} />);
    expect(screen.getByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
  });
});
