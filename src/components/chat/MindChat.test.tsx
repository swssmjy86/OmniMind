import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MindChat from "./MindChat";
import { deleteChatMessage, deleteAllChatMessages } from "@/lib/chat/actions";

vi.mock("@/lib/chat/actions", () => ({
  sendMessage: vi.fn(),
  deleteChatMessage: vi.fn(),
  deleteAllChatMessages: vi.fn(),
}));

const INITIAL = [
  { id: "u1", role: "user" as const, content: "오늘 좀 힘들었어요" },
  { id: "a1", role: "assistant" as const, content: "그런 날도 있죠." },
];

describe("MindChat — 대화 로그 삭제(P8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("메시지마다 삭제 버튼이 있고, 누르면 즉시 화면에서 사라지고 서버 삭제를 호출한다", async () => {
    vi.mocked(deleteChatMessage).mockResolvedValue({ ok: true });
    render(<MindChat nickname="달빛" initialMessages={INITIAL} remaining={0} />);

    expect(screen.getByText("오늘 좀 힘들었어요")).toBeInTheDocument();
    const deleteButtons = screen.getAllByLabelText("이 메시지 삭제");
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);

    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();
    await waitFor(() => expect(deleteChatMessage).toHaveBeenCalledWith("u1"));
    // 나머지 메시지는 그대로 남는다.
    expect(screen.getByText("그런 날도 있죠.")).toBeInTheDocument();
  });

  it("서버 삭제가 실패하면 지웠던 메시지를 되돌려놓는다", async () => {
    vi.mocked(deleteChatMessage).mockResolvedValue({ ok: false });
    render(<MindChat nickname="달빛" initialMessages={INITIAL} remaining={0} />);

    fireEvent.click(screen.getAllByLabelText("이 메시지 삭제")[0]);
    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("오늘 좀 힘들었어요")).toBeInTheDocument());
  });

  it("전체 삭제는 확인 후에만 진행되고, 취소하면 아무것도 지우지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MindChat nickname="달빛" initialMessages={INITIAL} remaining={0} />);

    fireEvent.click(screen.getByText("전체 삭제"));

    expect(deleteAllChatMessages).not.toHaveBeenCalled();
    expect(screen.getByText("오늘 좀 힘들었어요")).toBeInTheDocument();
  });

  it("전체 삭제를 확인하면 모든 메시지를 지우고 서버에도 반영한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteAllChatMessages).mockResolvedValue({ ok: true });
    render(<MindChat nickname="달빛" initialMessages={INITIAL} remaining={0} />);

    fireEvent.click(screen.getByText("전체 삭제"));

    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();
    expect(screen.queryByText("그런 날도 있죠.")).not.toBeInTheDocument();
    await waitFor(() => expect(deleteAllChatMessages).toHaveBeenCalled());
  });

  it("대화가 없으면 전체 삭제 버튼을 보여주지 않는다", () => {
    render(<MindChat nickname="달빛" initialMessages={[]} remaining={1} />);
    expect(screen.queryByText("전체 삭제")).not.toBeInTheDocument();
  });
});
