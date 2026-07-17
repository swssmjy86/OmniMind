import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MatchForm from "./MatchForm";
import type { MatchMe } from "@/lib/engine/match";

// 서버 액션은 jsdom에서 실행할 수 없다(next/headers) — 호출 여부만 필요한 목.
vi.mock("@/lib/metrics/actions", () => ({
  recordClientEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/match/actions", () => ({
  createInvite: vi.fn().mockResolvedValue({ ok: false }),
}));

const ME: MatchMe = {
  element: "목", zodiac: "사자자리", mbti: "ENFJ", dayGanzhi: "갑자", bloodType: "A",
};

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

    fireEvent.click(screen.getByText("ENFJ"));
    // MBTI '아직 몰라요'는 여전히 존재하며 재선택 가능
    const unknowns = screen.getAllByText("아직 몰라요");
    fireEvent.click(unknowns[0]);
    expect(unknowns[0]).toHaveClass("bg-primary-green");
  });

  it("상대 정보를 '나'처럼 입력한다 — 시간(+몰라요 체크)·혈액형 선택지가 있다", () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    const timeInput = container.querySelector('input[type="time"]');
    expect(timeInput).toBeInTheDocument();
    for (const b of ["A형", "B형", "O형", "AB형"]) {
      expect(screen.getByText(b)).toBeInTheDocument();
    }
    // '태어난 시간을 몰라요' 체크 시 시간 입력 비활성
    fireEvent.click(screen.getByLabelText("태어난 시간을 몰라요"));
    expect(timeInput).toBeDisabled();
  });

  it("혈액형까지 고르면 결과에 혈액형 섹션이 실린다", async () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "2000-01-07" },
    });
    fireEvent.click(screen.getByText("O형"));
    fireEvent.click(screen.getByText(/우리의 조합 잇기/));
    expect(await screen.findByText("혈액형이 말하길")).toBeInTheDocument();
  });

  it("출생 시간을 알려주면 야자시 경계까지 반영된 일주로 계산한다", async () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "2000-01-06" },
    });
    fireEvent.change(container.querySelector('input[type="time"]')!, {
      target: { value: "23:30" },
    });
    fireEvent.click(screen.getByText(/우리의 조합 잇기/));
    // 2000-01-06 23:30 → 야자시 → 갑자 일주가 본문에 실린다
    const flow = await screen.findByText(/갑자/);
    expect(flow).toBeInTheDocument();
  });
});
