import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MindChat from "./MindChat";
import { sendMessage } from "@/lib/chat/actions";
import type { ProfileContext } from "@/lib/engine";

vi.mock("@/lib/chat/actions", () => ({ sendMessage: vi.fn() }));

const CHAT_KEY = "om_chat_log";
const profile = {} as ProfileContext;
const seed = [
  { id: "u1", role: "user" as const, content: "오늘 좀 힘들었어요" },
  { id: "a1", role: "assistant" as const, content: "그런 날도 있죠." },
];

describe("MindChat — 익명 로컬 기록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("localStorage 기록을 불러와 렌더하고, 메시지 삭제는 즉시 화면·저장소에서 지운다", () => {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(seed));
    render(<MindChat nickname="달빛" profile={profile} />);

    expect(screen.getByText("오늘 좀 힘들었어요")).toBeInTheDocument();
    const deleteButtons = screen.getAllByLabelText("이 메시지 삭제");
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();
    expect(screen.getByText("그런 날도 있죠.")).toBeInTheDocument();
    // 저장소에도 반영
    const stored = JSON.parse(window.localStorage.getItem(CHAT_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it("전체 삭제는 확인 후에만 진행되고, 취소하면 아무것도 지우지 않는다", () => {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(seed));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MindChat nickname="달빛" profile={profile} />);

    fireEvent.click(screen.getByText("전체 삭제"));
    expect(screen.getByText("오늘 좀 힘들었어요")).toBeInTheDocument();
  });

  it("전체 삭제를 확인하면 모든 메시지를 지운다", () => {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(seed));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MindChat nickname="달빛" profile={profile} />);

    fireEvent.click(screen.getByText("전체 삭제"));
    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();
    expect(screen.queryByText("그런 날도 있죠.")).not.toBeInTheDocument();
  });

  it("기록이 없으면 전체 삭제 버튼을 보여주지 않는다", () => {
    render(<MindChat nickname="달빛" profile={profile} />);
    expect(screen.queryByText("전체 삭제")).not.toBeInTheDocument();
  });

  it("전송 대기 중 전체 삭제하면, 답이 와도 지운 기록이 되살아나지 않는다(스테일 클로저 회귀)", async () => {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(seed));
    let resolveSend!: (v: { ok: true; reply: string; source: "template" }) => void;
    vi.mocked(sendMessage).mockReturnValue(
      new Promise((r) => { resolveSend = r; }),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MindChat nickname="달빛" profile={profile} />);

    fireEvent.change(screen.getByPlaceholderText("마음을 들려주세요…"), { target: { value: "안녕" } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    // 응답 대기 중 전체 삭제
    fireEvent.click(screen.getByText("전체 삭제"));
    // 이제 응답 도착
    resolveSend({ ok: true, reply: "곁에 있을게요.", source: "template" });

    expect(await screen.findByText("곁에 있을게요.")).toBeInTheDocument();
    // 지운 기록은 되살아나지 않고, 저장소에도 없다
    expect(screen.queryByText("오늘 좀 힘들었어요")).not.toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(CHAT_KEY) ?? "[]");
    expect(stored.some((m: { content: string }) => m.content === "오늘 좀 힘들었어요")).toBe(false);
  });

  it("보내면 프로필 맥락과 함께 sendMessage를 부르고 답을 붙인다", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ ok: true, reply: "곁에 있을게요.", source: "template" });
    render(<MindChat nickname="달빛" profile={profile} />);

    fireEvent.change(screen.getByPlaceholderText("마음을 들려주세요…"), {
      target: { value: "안녕" },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText("곁에 있을게요.")).toBeInTheDocument();
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: "달빛", message: "안녕", profile }),
      ),
    );
  });
});
