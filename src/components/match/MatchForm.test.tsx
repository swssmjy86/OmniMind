import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchForm from "./MatchForm";
import type { MatchMe } from "@/lib/engine/match";

const ME: MatchMe = { element: "목", zodiac: "사자자리", mbti: "ENFJ", dayGanzhi: "갑자" };

describe("MatchForm", () => {
  it(
    "'상대가 세상에 온 날' 입력에 min/max 연도 상한이 있다 — 없으면 브라우저 date input의 " +
      "연도 칸이 자릿수 제한 없이 이어져 월/일 칸까지 밀리는 렌더링 버그가 생긴다",
    () => {
      const { container } = render(<MatchForm me={ME} nickname="달빛" />);
      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toHaveAttribute("min", "1900-01-01");
      expect(dateInput).toHaveAttribute("max", "2100-12-31");
    },
  );

  it("MBTI는 네이티브 select가 아니라 알약형 버튼 그리드로 고른다(브랜드 톤 일관성)", () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    expect(container.querySelector("select")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("ENFJ"));
    expect(screen.getByText("ENFJ")).toHaveClass("bg-primary-green");
    expect(screen.getByText("아직 몰라요")).not.toHaveClass("bg-primary-green");

    fireEvent.click(screen.getByText("아직 몰라요"));
    expect(screen.getByText("아직 몰라요")).toHaveClass("bg-primary-green");
    expect(screen.getByText("ENFJ")).not.toHaveClass("bg-primary-green");
  });
});
