import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PersonaImageIntro from "./PersonaImageIntro";

const PROPS = {
  personaId: "seoon",
  eyebrow: "📜 서온 · 총운",
  line: "당신의 여덟 글자, 서고에 이미 닿아 있어요.",
  image: "/images/persona/seoon.webp",
  imagePosition: "50% 45%",
};

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("PersonaImageIntro", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("진입하면 인사 오버레이가 뜬다", async () => {
    render(<PersonaImageIntro {...PROPS} />);
    await advance(200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(PROPS.line)).toBeInTheDocument();
  });

  it("페이지를 나갔다 다시 들어오면(재마운트) 매번 다시 뜬다", async () => {
    const first = render(<PersonaImageIntro {...PROPS} />);
    await advance(200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    first.unmount();
    render(<PersonaImageIntro {...PROPS} />);
    await advance(200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("일정 시간 뒤 스스로 사라지고 onClose를 부른다", async () => {
    const onClose = vi.fn();
    render(<PersonaImageIntro {...PROPS} onClose={onClose} />);
    await advance(200);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await advance(2600 + 300);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("건너뛰기를 누르면 바로 사라지고 onClose를 부른다", async () => {
    const onClose = vi.fn();
    render(<PersonaImageIntro {...PROPS} onClose={onClose} />);
    await advance(200);
    act(() => {
      screen.getByRole("button", { name: "인사 건너뛰기" }).click();
    });
    await advance(300);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("배경(바깥 영역)을 탭해도 닫힌다", async () => {
    render(<PersonaImageIntro {...PROPS} />);
    await advance(200);
    act(() => {
      screen.getByRole("dialog").click();
    });
    await advance(300);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("카드 안쪽(일러스트)을 탭해도 닫히지 않는다", async () => {
    render(<PersonaImageIntro {...PROPS} />);
    await advance(200);
    const dialog = screen.getByRole("dialog");
    act(() => {
      dialog.querySelector("img")!.click();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
