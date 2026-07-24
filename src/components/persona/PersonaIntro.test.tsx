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

  it("holdOnEnd — 완주하면 사라지는 대신 마지막 프레임이 배경으로 남는다(컨트롤 숨김·onClose 호출)", async () => {
    const onClose = vi.fn();
    render(<PersonaIntro {...PROPS} holdOnEnd onClose={onClose} />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.ended(dialog.querySelector("video")!);
    // 대화상자 역할은 걷히지만(배경은 장식) 영상 프레임은 남아 있다.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.querySelector("video")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "인사 영상 건너뛰기" })).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("holdOnEnd — 건너뛰기도 배경으로 남고 onComplete는 부르지 않는다", async () => {
    const onComplete = vi.fn();
    render(<PersonaIntro {...PROPS} holdOnEnd onComplete={onComplete} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.querySelector("video")).not.toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("holdOnEnd — 배경이 된 뒤 release가 참이 되면 그때 페이드아웃으로 걷힌다", async () => {
    const { rerender } = render(<PersonaIntro {...PROPS} holdOnEnd />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.ended(dialog.querySelector("video")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.querySelector("video")).not.toBeNull();
    rerender(<PersonaIntro {...PROPS} holdOnEnd release />);
    await waitFor(() => expect(document.querySelector("video")).toBeNull());
  });

  it("움직임 줄이기(prefers-reduced-motion) 설정과 무관하게 자동재생한다 — 인트로는 핵심 콘텐츠", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      expect(dialog.querySelector("video")!.autoplay).toBe(true);
      expect(screen.queryByRole("button", { name: "인사 영상 재생" })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("▶ 버튼으로 재생을 시작하면 버튼이 사라진다", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockRejectedValue(new DOMException("NotAllowedError")); // 모든 자동재생 차단 환경
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(await screen.findByRole("button", { name: "인사 영상 재생" }));
      // jsdom은 play()가 실제 재생을 일으키지 않으므로 play 이벤트를 직접 흘린다.
      fireEvent.play(dialog.querySelector("video")!);
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "인사 영상 재생" })).not.toBeInTheDocument(),
      );
    } finally {
      play.mockRestore();
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

  it("소리 켠 자동재생이 허용되는 환경이면 소리 ON으로 재생된다 — 버튼으로 끄고 켤 수 있다", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined); // 소리 켠 play() 허용 환경
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      const video = dialog.querySelector("video")!;
      await waitFor(() => expect(video.muted).toBe(false));
      fireEvent.click(await screen.findByRole("button", { name: "🔊 소리 끄기" }));
      expect(video.muted).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "🔇 소리 켜기" }));
      expect(video.muted).toBe(false);
    } finally {
      play.mockRestore();
    }
  });

  it("영상 태그는 선언적 무음 자동재생 조합(autoplay·muted 속성·playsinline)을 갖춘다", async () => {
    render(<PersonaIntro {...PROPS} />);
    const dialog = await screen.findByRole("dialog");
    const video = dialog.querySelector("video")!;
    expect(video.autoplay).toBe(true);
    expect(video.defaultMuted).toBe(true); // muted 콘텐츠 속성 — 모바일 자동재생 정책의 요건
    expect(video.playsInline).toBe(true);
  });

  it("▶ 버튼 재생은 사용자 제스처이므로 소리를 켠 채 시작한다", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockRejectedValue(new DOMException("NotAllowedError")); // 모든 자동재생 차단 환경
    try {
      render(<PersonaIntro {...PROPS} />);
      const dialog = await screen.findByRole("dialog");
      const video = dialog.querySelector("video")!;
      fireEvent.click(await screen.findByRole("button", { name: "인사 영상 재생" }));
      expect(video.muted).toBe(false);
      expect(screen.getByRole("button", { name: "🔊 소리 끄기" })).toBeInTheDocument();
    } finally {
      play.mockRestore();
    }
  });
});
