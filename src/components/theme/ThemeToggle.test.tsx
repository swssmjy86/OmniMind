import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "./ThemeToggle";
import { THEME_KEY } from "@/lib/theme/store";

describe("화면 모드 토글", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("기본값은 시스템 모드다", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAccessibleName(/시스템/);
  });

  it("저장된 값이 있으면 마운트 후 그 값으로 동기화한다", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAccessibleName(/다크/);
  });

  it("클릭할 때마다 시스템 → 라이트 → 다크 → 시스템 순으로 순환하며 data-theme·localStorage에 반영한다", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(button).toHaveAccessibleName(/라이트/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");

    fireEvent.click(button);
    expect(button).toHaveAccessibleName(/다크/);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    fireEvent.click(button);
    expect(button).toHaveAccessibleName(/시스템/);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBe("system");
  });
});
