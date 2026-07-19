import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchDeepForm from "./MatchDeepForm";
import { unlockMatchDeep } from "@/lib/readings/actions";

vi.mock("@/lib/readings/actions", () => ({ unlockMatchDeep: vi.fn() }));

function fill() {
  fireEvent.change(screen.getByLabelText(/상대의 생년월일/), {
    target: { value: "1992-03-10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "시간을 몰라요" }));
  // MBTI 4축 — I / S / T / P
  for (const axis of ["I", "S", "T", "P"]) {
    fireEvent.click(screen.getByRole("button", { name: axis }));
  }
  fireEvent.click(screen.getByRole("button", { name: "O" }));   // 혈액형
  fireEvent.click(screen.getByRole("button", { name: "연인" })); // 모드
}

describe("MatchDeepForm (3단계 스펙 §5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("상대 입력 필드 전부와 비활성 열기 버튼을 렌더한다", () => {
    render(<MatchDeepForm remaining={2} unlimited={false} />);
    expect(screen.getByText("상대의 생년월일")).toBeInTheDocument();
    expect(screen.getByText("상대의 태어난 시간")).toBeInTheDocument();
    expect(screen.getByText("상대의 MBTI")).toBeInTheDocument();
    expect(screen.getByText("상대의 혈액형")).toBeInTheDocument();
    expect(screen.getByText("우리는 어떤 사이인가요?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).toBeDisabled();
  });

  it("전부 채우면 버튼 활성 → 성공 시 섹션 렌더·액션에 슬러그 모드 전달", async () => {
    vi.mocked(unlockMatchDeep).mockResolvedValue({
      ok: true, usedCredit: true, remaining: 1, readingId: "r-1",
      sections: [{ title: "우리의 온도", body: "두 분의 온도는 78°예요." }],
    });
    render(<MatchDeepForm remaining={2} unlimited={false} />);
    fill();
    const btn = screen.getByRole("button", { name: /크레딧 1개로 열기/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(await screen.findByText("우리의 온도")).toBeInTheDocument();
    expect(vi.mocked(unlockMatchDeep)).toHaveBeenCalledWith({
      birthDate: "1992-03-10", birthTime: "", timeUnknown: true,
      mbti: "ISTP", bloodType: "O", mode: "lover",
    });
  });

  it("크레딧 0·비무제한 — 폼 대신 충전 링크", () => {
    render(<MatchDeepForm remaining={0} unlimited={false} />);
    expect(screen.getByRole("link", { name: /크레딧 채우기/ })).toHaveAttribute(
      "href", "/premium/credits",
    );
  });

  it("실패 — 부드러운 안내", async () => {
    vi.mocked(unlockMatchDeep).mockResolvedValue({ ok: false, reason: "error" });
    render(<MatchDeepForm remaining={2} unlimited={false} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText(/지금은 풀이가 어려워요/)).toBeInTheDocument();
  });
});
