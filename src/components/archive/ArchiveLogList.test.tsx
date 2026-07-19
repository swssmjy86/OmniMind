import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArchiveLogList from "./ArchiveLogList";
import { deleteAllDailyLogs, deleteDailyLog } from "@/lib/archive/actions";

vi.mock("@/lib/archive/actions", () => ({
  deleteDailyLog: vi.fn(),
  deleteAllDailyLogs: vi.fn(),
}));

const entries = [
  { id: "a", date: "2026-07-19", headline: "오늘은 화(병오)의 기운이 흐르는 날이에요." },
  { id: "b", date: "2026-07-18", headline: "오늘은 목(갑인)의 기운이 흐르는 날이에요." },
];

describe("ArchiveLogList — 개별·전체 삭제", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("기록·개별 삭제 버튼·전체 삭제 버튼을 렌더한다", () => {
    render(<ArchiveLogList entries={entries} />);
    expect(screen.getByText("오늘의운세 기록")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이 기록 삭제" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "전체 삭제" })).toBeInTheDocument();
  });

  it("개별 삭제 — 낙관적 제거, 실패 시 롤백", async () => {
    vi.mocked(deleteDailyLog).mockResolvedValue({ ok: false });
    render(<ArchiveLogList entries={entries} />);
    fireEvent.click(screen.getAllByRole("button", { name: "이 기록 삭제" })[0]);
    await waitFor(() => expect(screen.getByText(/2026-07-19/)).toBeInTheDocument()); // 롤백
    vi.mocked(deleteDailyLog).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getAllByRole("button", { name: "이 기록 삭제" })[0]);
    await waitFor(() => expect(screen.queryByText(/2026-07-19/)).not.toBeInTheDocument());
    expect(screen.getByText(/2026-07-18/)).toBeInTheDocument();
  });

  it("전체 삭제 — confirm 후 비우고 빈 상태 표시, 취소 시 유지", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ArchiveLogList entries={entries} />);
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
    expect(deleteAllDailyLogs).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    vi.mocked(deleteAllDailyLogs).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
    expect(await screen.findByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 삭제" })).not.toBeInTheDocument();
  });

  it("빈 목록 — 빈 상태 안내, 전체 삭제 버튼 없음", () => {
    render(<ArchiveLogList entries={[]} />);
    expect(screen.getByText(/아직 쌓인 기록이 없어요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 삭제" })).not.toBeInTheDocument();
  });
});
