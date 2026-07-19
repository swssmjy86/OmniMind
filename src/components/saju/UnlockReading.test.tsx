import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnlockReading from "./UnlockReading";
import { unlockReading } from "@/lib/readings/actions";

vi.mock("@/lib/readings/actions", () => ({ unlockReading: vi.fn() }));

describe("UnlockReading (3단계 스펙 §4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("크레딧 있으면 열기 버튼·잔여 표시", () => {
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).toBeInTheDocument();
    expect(screen.getByText(/남은 크레딧 3개/)).toBeInTheDocument();
  });

  it("크레딧 0이면 버튼 대신 충전 링크", () => {
    render(<UnlockReading product="career" remaining={0} unlimited={false} />);
    expect(screen.queryByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /크레딧 채우기/ })).toHaveAttribute(
      "href", "/premium/credits",
    );
  });

  it("레거시 프리미엄이면 차감 안내 없이 열기 버튼", () => {
    render(<UnlockReading product="career" remaining={-1} unlimited />);
    expect(screen.getByRole("button", { name: /지금 열어보기/ })).toBeInTheDocument();
  });

  it("열기 성공 → 반환된 섹션을 렌더한다", async () => {
    vi.mocked(unlockReading).mockResolvedValue({
      ok: true, usedCredit: true, remaining: 2,
      sections: [{ title: "일의 결", body: "새벽님, 일에서 당신은..." }],
    });
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText("일의 결")).toBeInTheDocument();
    expect(screen.getByText(/새벽님/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeInTheDocument();
  });

  it("실패 → 부드러운 오류 안내, 버튼 유지", async () => {
    vi.mocked(unlockReading).mockResolvedValue({ ok: false, reason: "error" });
    render(<UnlockReading product="career" remaining={3} unlimited={false} />);
    fireEvent.click(screen.getByRole("button", { name: /크레딧 1개로 열기/ }));
    expect(await screen.findByText(/지금은 풀이가 어려워요/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /크레딧 1개로 열기/ })).not.toBeDisabled(),
    );
  });
});
