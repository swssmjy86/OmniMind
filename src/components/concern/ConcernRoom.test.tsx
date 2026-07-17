import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConcernRoom, { type PastAdvice } from "./ConcernRoom";
import { deleteConcernLog, deleteAllConcernLogs } from "@/lib/concern/actions";

vi.mock("@/lib/concern/actions", () => ({
  submitConcern: vi.fn(),
  deleteConcernLog: vi.fn(),
  deleteAllConcernLogs: vi.fn(),
}));

const PAST: PastAdvice[] = [
  {
    id: "advice-1",
    date: "2026.07.10",
    sections: [
      { title: "고민", body: "이직을 고민하고 있어요" },
      { title: "당신에게", body: "천천히 살펴봐요." },
    ],
  },
];

describe("ConcernRoom — 고민 상담 로그 삭제(P8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("지난 고민 항목마다 삭제 버튼이 있고, 누르면 즉시 목록에서 사라지고 서버 삭제를 호출한다", async () => {
    vi.mocked(deleteConcernLog).mockResolvedValue({ ok: true });
    render(<ConcernRoom nickname="달빛" remaining={1} past={PAST} />);

    expect(screen.getAllByText(/이직을 고민하고 있어요/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("이 고민 기록 삭제"));

    expect(screen.queryAllByText(/이직을 고민하고 있어요/)).toHaveLength(0);
    await waitFor(() => expect(deleteConcernLog).toHaveBeenCalledWith("advice-1"));
  });

  it("전체 삭제는 확인 후에만 진행된다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ConcernRoom nickname="달빛" remaining={1} past={PAST} />);

    fireEvent.click(screen.getByText("전체 삭제"));

    expect(deleteAllConcernLogs).not.toHaveBeenCalled();
    expect(screen.getAllByText(/이직을 고민하고 있어요/).length).toBeGreaterThan(0);
  });

  it("전체 삭제를 확인하면 지난 고민 섹션 자체가 사라지고 서버에도 반영한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteAllConcernLogs).mockResolvedValue({ ok: true });
    render(<ConcernRoom nickname="달빛" remaining={1} past={PAST} />);

    fireEvent.click(screen.getByText("전체 삭제"));

    expect(screen.queryByText("지난 고민들")).not.toBeInTheDocument();
    await waitFor(() => expect(deleteAllConcernLogs).toHaveBeenCalled());
  });

  it("지난 고민이 없으면 '지난 고민들' 섹션 자체를 보여주지 않는다", () => {
    render(<ConcernRoom nickname="달빛" remaining={1} past={[]} />);
    expect(screen.queryByText("지난 고민들")).not.toBeInTheDocument();
  });
});
