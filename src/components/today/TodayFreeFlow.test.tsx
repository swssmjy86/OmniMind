import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayFreeFlow from "./TodayFreeFlow";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";
import { computeGuestDailyPersonal } from "@/lib/today/actions";

vi.mock("@/lib/today/actions", () => ({ computeGuestDailyPersonal: vi.fn() }));

const props = {
  headline: "헤드라인",
  mind: "마음가짐",
  color: "코랄",
  keyword: "성장",
  lucky: "산책",
  sky: { moon: "달 문구", riseSet: "출몰 문구", altitude: "고도 문구" },
};

describe("TodayFreeFlow — 비로그인 오늘의운세 개인화", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("저장된 태어난 정보가 없으면 개인화 요청을 하지 않는다", async () => {
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText("헤드라인")).toBeInTheDocument();
    expect(computeGuestDailyPersonal).not.toHaveBeenCalled();
  });

  it("인트로가 없으면 저장된 정보 없을 때 입력 시트가 바로 뜬다", async () => {
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
  });

  it("인트로 영상이 있으면 입력 시트는 영상이 걷힌 뒤에 팝업으로 뜬다", async () => {
    const intro = {
      personaId: "dalzigi",
      eyebrow: "🏮 달지기 · 오늘의운세",
      line: "한 줄",
      src: "/videos/dalzigi-intro.mp4",
    };
    render(<TodayFreeFlow {...props} intro={intro} />);
    // 인트로 오버레이가 떠 있는 동안엔 시트가 없다.
    const dialog = await screen.findByRole("dialog");
    expect(screen.queryByText("태어난 날을 알려주실래요?")).not.toBeInTheDocument();
    // 영상 완주 → 오버레이 페이드아웃 → 그제서야 시트 등장.
    fireEvent.ended(dialog.querySelector("video")!);
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("인트로를 건너뛰어도 입력 시트는 뜬다", async () => {
    const intro = {
      personaId: "dalzigi",
      eyebrow: "🏮 달지기 · 오늘의운세",
      line: "한 줄",
      src: "/videos/dalzigi-intro.mp4",
    };
    render(<TodayFreeFlow {...props} intro={intro} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
  });

  it("저장된 태어난 날이 있으면 개인화 문장을 받아와 보여준다", async () => {
    window.localStorage.setItem(
      TODAY_BIRTH_KEY,
      JSON.stringify({ birthDate: "1990-06-15", birthTime: "", gender: null }),
    );
    vi.mocked(computeGuestDailyPersonal).mockResolvedValue("오늘은 당신다움이 드러나는 날이에요.");
    render(<TodayFreeFlow {...props} />);
    expect(computeGuestDailyPersonal).toHaveBeenCalledWith("1990-06-15", "");
    expect(await screen.findByText("오늘은 당신다움이 드러나는 날이에요.")).toBeInTheDocument();
  });
});
