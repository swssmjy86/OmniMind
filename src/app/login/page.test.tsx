import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

// Supabase 클라이언트 목 — OAuth 성공/실패 시나리오 제어.
const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

describe("로그인 페이지", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  it("카카오·Google 시작 버튼을 렌더한다", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /카카오로 시작하기/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Google로 시작하기/ })).toBeInTheDocument();
  });

  it("Google 클릭 시 redirectTo와 함께 OAuth를 요청하고, 진행 중엔 중복 클릭을 막는다", async () => {
    signInWithOAuth.mockResolvedValue({ error: null }); // 성공 → 브라우저 리다이렉트 대기 상태
    render(<LoginPage />);
    const btn = screen.getByRole("button", { name: /Google로 시작하기/ });
    fireEvent.click(btn);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Google로 잇는 중/ })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: /카카오/ })).toBeDisabled();
  });

  it("OAuth 실패(provider 미설정 등) 시 §5.4 톤 안내를 보여주고 다시 시도할 수 있다", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "provider is not enabled" } });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /Google로 시작하기/ }));
    const notice = await screen.findByRole("status");
    expect(notice.textContent).toContain("Google 문이 잠시 닫혀 있어요");
    // 실패 후엔 버튼이 다시 활성화된다
    expect(screen.getByRole("button", { name: /Google로 시작하기/ })).toBeEnabled();
  });

  it("콜백 실패로 돌아오면(?error=auth) 안내를 보여준다", async () => {
    window.history.replaceState({}, "", "/login?error=auth");
    render(<LoginPage />);
    const notice = await screen.findByRole("status");
    expect(notice.textContent).toContain("잠시 길이 어긋났어요");
  });

  it("실패 사유(reason)가 있으면 진단용으로 함께 표기한다", async () => {
    window.history.replaceState(
      {}, "", "/login?error=auth&reason=invalid%20flow%20state",
    );
    render(<LoginPage />);
    await screen.findByRole("status");
    expect(screen.getByText("(invalid flow state)")).toBeInTheDocument();
  });
});
