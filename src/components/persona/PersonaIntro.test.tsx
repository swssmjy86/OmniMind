import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PersonaIntro from "./PersonaIntro";

const PROPS = {
  personaId: "dalzigi",
  eyebrow: "🏮 달지기 · 오늘의운세",
  line: "밤이 깊어도 등불은 켜 두었어요. 오늘의 기운, 함께 볼까요?",
  src: "/videos/dalzigi-intro.mp4",
};

describe("PersonaIntro", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("처음 진입하면 영상 오버레이가 뜨고, 세션에 본 것으로 기록된다", async () => {
    render(<PersonaIntro {...PROPS} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(PROPS.line)).toBeInTheDocument();
    expect(sessionStorage.getItem("persona-intro-seen:dalzigi")).toBe("1");
  });

  it("이미 본 세션에서는 다시 뜨지 않는다", () => {
    sessionStorage.setItem("persona-intro-seen:dalzigi", "1");
    render(<PersonaIntro {...PROPS} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("건너뛰기를 누르면 사라진다", async () => {
    render(<PersonaIntro {...PROPS} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    // 페이드아웃(300ms) 뒤 언마운트
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("영상이 끝나면 스스로 닫힌다", async () => {
    render(<PersonaIntro {...PROPS} />);
    const dialog = await screen.findByRole("dialog");
    const video = dialog.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.ended(video!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("움직임 줄이기(prefers-reduced-motion) 사용자는 자동재생 영상을 보지 않는다", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<PersonaIntro {...PROPS} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("소리 켜기 버튼으로 음소거를 풀 수 있다 (모바일 자동재생 정책상 음소거로 시작)", async () => {
    render(<PersonaIntro {...PROPS} />);
    const dialog = await screen.findByRole("dialog");
    const video = dialog.querySelector("video")!;
    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "🔇 소리 켜기" }));
    expect(video.muted).toBe(false);
    expect(screen.getByRole("button", { name: "🔊 소리 끄기" })).toBeInTheDocument();
  });
});
