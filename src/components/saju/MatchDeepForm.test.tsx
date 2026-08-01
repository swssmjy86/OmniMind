import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MatchDeepForm from "./MatchDeepForm";
import { computeGuestMatchDeep } from "@/lib/readings/guest-actions";

vi.mock("@/lib/readings/guest-actions", () => ({ computeGuestMatchDeep: vi.fn() }));

const myDraft = { nickname: "다인", birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false };

function fill() {
  fireEvent.change(screen.getByLabelText(/상대의 생년월일/), {
    target: { value: "1992-03-10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "시간을 몰라요" }));
  fireEvent.click(screen.getByRole("button", { name: "연인" })); // 모드
}

describe("MatchDeepForm (익명 로컬)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("상대 입력 필드 전부와 비활성 열기 버튼을 렌더한다", () => {
    render(<MatchDeepForm myDraft={myDraft} />);
    expect(screen.getByText("상대의 생년월일")).toBeInTheDocument();
    expect(screen.getByText("상대의 태어난 시간")).toBeInTheDocument();
    expect(screen.getByText("우리는 어떤 사이인가요?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /지금 열어보기/ })).toBeDisabled();
  });

  it("전부 채우면 버튼 활성 → computeGuestMatchDeep을 myDraft·슬러그 모드와 함께 부른다", async () => {
    vi.mocked(computeGuestMatchDeep).mockResolvedValue({
      ok: true, readingId: null,
      sections: [{ title: "우리의 온도", body: "두 분의 온도는 78°예요." }],
    });
    render(<MatchDeepForm myDraft={myDraft} />);
    fill();
    const btn = screen.getByRole("button", { name: /지금 열어보기/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(await screen.findByText("우리의 온도")).toBeInTheDocument();
    expect(vi.mocked(computeGuestMatchDeep)).toHaveBeenCalledWith(myDraft, {
      birthDate: "1992-03-10", birthTime: "", timeUnknown: true, mode: "lover",
    });
  });

  it("실패 — 부드러운 안내", async () => {
    vi.mocked(computeGuestMatchDeep).mockResolvedValue({ ok: false, reason: "invalid" });
    render(<MatchDeepForm myDraft={myDraft} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /지금 열어보기/ }));
    expect(await screen.findByText(/지금은 풀이가 어려워요/)).toBeInTheDocument();
  });
});
