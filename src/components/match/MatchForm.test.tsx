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
// 엔진 throw 시의 오류 안내를 검증하기 위한 통과형 래퍼 — 기본은 실제 구현 그대로.
vi.mock("@/lib/engine/match", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engine/match")>();
  return { ...actual, computeMatch: vi.fn(actual.computeMatch) };
});

const ME: MatchMe = { element: "목", zodiac: "사자자리", dayGanzhi: "갑자" };

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

  it("빈 날짜·시간 입력에는 안내 문구가 보인다 — iOS WebKit은 빈 입력을 아무것도 없이 그린다", () => {
    render(<MatchForm me={ME} nickname="달빛" />);
    expect(screen.getByText("눌러서 날짜를 골라 주세요")).toBeInTheDocument();
    expect(screen.getByText("눌러서 시간을 골라 주세요")).toBeInTheDocument();
  });

  it("상대 정보를 '나'처럼 입력한다 — 시간(+몰라요 체크)이 있다", () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    const timeInput = container.querySelector('input[type="time"]');
    expect(timeInput).toBeInTheDocument();
    // '태어난 시간을 몰라요' 체크 시 시간 입력 비활성
    fireEvent.click(screen.getByLabelText("태어난 시간을 몰라요"));
    expect(timeInput).toBeDisabled();
  });

  it("날짜를 고르고 계산하면 사주·별자리 결과 섹션이 실린다(MBTI·혈액형 없이)", async () => {
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "2000-01-07" },
    });
    fireEvent.click(screen.getByText(/우리의 조합 잇기/));
    expect(await screen.findByText("우리의 온도")).toBeInTheDocument();
    expect(screen.getByText("기운의 흐름")).toBeInTheDocument();
    expect(screen.getByText("별이 말하길")).toBeInTheDocument();
  });

  it("엔진이 입력을 거부하면(예: 시간 형식 오류) 날짜만 지목하지 않고 날짜·시간을 함께 확인하도록 안내한다", async () => {
    // 일부 브라우저에서 time 입력이 텍스트로 강등되면 '9:30' 같은 비정규 형식이 엔진까지
    // 온다 — jsdom은 스펙대로 잘못된 값을 빈 문자열로 소독해 UI 경유로는 재현이 안 되므로
    // 엔진 throw를 직접 강제한다.
    const { computeMatch } = await import("@/lib/engine/match");
    vi.mocked(computeMatch).mockImplementationOnce(() => {
      throw new Error("birthTime 형식 오류: 9:30");
    });
    const { container } = render(<MatchForm me={ME} nickname="달빛" />);
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "2000-01-06" },
    });
    fireEvent.click(screen.getByText(/우리의 조합 잇기/));
    expect(
      await screen.findByText("입력하신 날짜와 시간을 다시 한번 확인해주실래요?"),
    ).toBeInTheDocument();
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
