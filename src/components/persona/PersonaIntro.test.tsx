import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PersonaIntro from "./PersonaIntro";

const PROPS = {
  personaId: "dalzigi",
  eyebrow: "🏮 달지기 · 오늘의운세",
  line: "밤이 깊어도 등불은 켜 두었어요. 오늘의 기운, 함께 볼까요?",
  src: "/videos/dalzigi-intro.mp4",
};

describe("PersonaIntro", () => {
  it("진입하면 영상 오버레이가 뜬다", async () => {
    render(<PersonaIntro {...PROPS} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(PROPS.line)).toBeInTheDocument();
  });

  it("페이지를 나갔다 다시 들어오면(재마운트) 매번 다시 뜬다", async () => {
    const first = render(<PersonaIntro {...PROPS} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    first.unmount();
    render(<PersonaIntro {...PROPS} />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("건너뛰기를 누르면 사라진다", async () => {
    render(<PersonaIntro {...PROPS} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    // 페이드아웃(300ms) 뒤 언마운트
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("영상이 끝나면 스스로 닫히고 onComplete를 부른다", async () => {
    const onComplete = vi.fn();
    render(<PersonaIntro {...PROPS} onComplete={onComplete} />);
    const dialog = await screen.findByRole("dialog");
    const video = dialog.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.ended(video!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("건너뛰기로 닫을 때는 onComplete를 부르지 않는다", async () => {
    const onComplete = vi.fn();
    render(<PersonaIntro {...PROPS} onComplete={onComplete} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("onClose는 닫힘 사유와 무관하게 불린다 — 완주", async () => {
    const onClose = vi.fn();
    render(<PersonaIntro {...PROPS} onClose={onClose} />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.ended(dialog.querySelector("video")!);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("onClose는 닫힘 사유와 무관하게 불린다 — 건너뛰기", async () => {
    const onClose = vi.fn();
    render(<PersonaIntro {...PROPS} onClose={onClose} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("움직임 줄이기(prefers-reduced-motion) 사용자는 자동재생 대신 ▶ 버튼을 본다", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<PersonaIntro {...PROPS} />);
      // 오버레이는 뜨되 자동재생하지 않고 ▶ 버튼을 준다.
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "인사 영상 재생" })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("▶ 버튼으로 재생을 시작하면 버튼이 사라진다", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: "인사 영상 재생" }));
      // jsdom은 play()가 실제 재생을 일으키지 않으므로 play 이벤트를 직접 흘린다.
      fireEvent.play(dialog.querySelector("video")!);
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "인사 영상 재생" })).not.toBeInTheDocument(),
      );
    } finally {
      window.matchMedia = original;
    }
  });

  it("일반 사용자에겐 ▶ 버튼 없이 자동재생을 시도한다", async () => {
    render(<PersonaIntro {...PROPS} />);
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "인사 영상 재생" })).not.toBeInTheDocument();
  });

  it("소리 자동재생이 차단되면 음소거로 폴백해 재생한다 (소리 켜기 버튼 제공)", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("NotAllowedError")) // 1차: 소리 켠 시도 차단
      .mockResolvedValue(undefined); // 2차: 음소거 재생은 허용
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      const video = dialog.querySelector("video")!;
      await waitFor(() => expect(video.muted).toBe(true));
      expect(screen.getByRole("button", { name: "🔇 소리 켜기" })).toBeInTheDocument();
      // 음소거 재생이 됐으므로 ▶ 버튼까지 가지 않는다.
      expect(screen.queryByRole("button", { name: "인사 영상 재생" })).not.toBeInTheDocument();
    } finally {
      play.mockRestore();
    }
  });

  it("음소거 자동재생마저 차단되면(저전력 모드 등) ▶ 버튼으로 전환된다", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockRejectedValue(new DOMException("NotAllowedError"));
    try {
      render(<PersonaIntro {...PROPS} />);
      await screen.findByRole("dialog");
      expect(await screen.findByRole("button", { name: "인사 영상 재생" })).toBeInTheDocument();
    } finally {
      play.mockRestore();
    }
  });

  it("소리 켠 자동재생을 우선 시도한다 — 버튼으로 끄고 켤 수 있다", async () => {
    render(<PersonaIntro {...PROPS} />);
    const dialog = await screen.findByRole("dialog");
    const video = dialog.querySelector("video")!;
    // jsdom의 play()는 성공도 실패도 알려주지 않으므로 1차(소리 켠) 시도 상태로 남는다.
    await waitFor(() => expect(video.muted).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "🔊 소리 끄기" }));
    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "🔇 소리 켜기" }));
    expect(video.muted).toBe(false);
  });

  it("▶ 버튼 재생은 사용자 제스처이므로 소리를 켠 채 시작한다", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      const video = dialog.querySelector("video")!;
      fireEvent.click(screen.getByRole("button", { name: "인사 영상 재생" }));
      expect(video.muted).toBe(false);
      expect(screen.getByRole("button", { name: "🔊 소리 끄기" })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
