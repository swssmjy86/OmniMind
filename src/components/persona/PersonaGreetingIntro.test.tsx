import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PersonaGreetingIntro from "./PersonaGreetingIntro";

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

// jsdom엔 HTMLMediaElement.play가 없어 최소 목을 심는다(PersonaIntro가 호출).
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockReturnValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PersonaGreetingIntro", () => {
  it("영상이 있는 페르소나(서온)는 인트로 영상으로 인사한다", async () => {
    render(<PersonaGreetingIntro personaId="seoon" eyebrow="📜 서온 · 총운" line="반가워요" />);
    await advance(200);
    const dialog = screen.getByRole("dialog");
    const video = dialog.querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("src")).toBe("/videos/seoon-intro.mp4");
    expect(dialog.querySelector("img")).toBeNull();
  });

  it("영상이 없는 페르소나(연리)는 정지 일러스트로 폴백한다", async () => {
    render(<PersonaGreetingIntro personaId="yeonri" eyebrow="🌿 연리 · 궁합" line="반가워요" />);
    await advance(200);
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("video")).toBeNull();
    expect(dialog.querySelector("img")).not.toBeNull();
  });
});
