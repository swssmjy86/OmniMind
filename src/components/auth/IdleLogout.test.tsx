import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IdleLogout from "./IdleLogout";
import {
  IDLE_CHECK_INTERVAL_MS,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
} from "@/lib/auth/constants";

// Supabase 클라이언트 목 — 세션 유무·로그아웃 호출을 제어한다.
const getSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession, signOut } }),
}));

// jsdom의 window.location은 교체할 수 없어 리다이렉트는 모듈 단위로 목킹한다.
const redirectToIdleLogin = vi.fn();
vi.mock("@/lib/auth/idle-redirect", () => ({
  redirectToIdleLogin: () => redirectToIdleLogin(),
}));

/** getSession → signOut → 리다이렉트로 이어지는 프라미스 체인을 끝까지 흘린다. */
const flushMicrotasks = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("IdleLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getSession.mockReset().mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    signOut.mockReset().mockResolvedValue({ error: null });
    redirectToIdleLogin.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("타임아웃 동안 활동이 없으면 로그아웃하고 로그인 화면으로 보낸다", async () => {
    render(<IdleLogout />);
    await flushMicrotasks();
    await advance(IDLE_TIMEOUT_MS + IDLE_CHECK_INTERVAL_MS);
    await flushMicrotasks();
    expect(signOut).toHaveBeenCalled();
    expect(redirectToIdleLogin).toHaveBeenCalled();
  });

  it("활동이 있으면 만료 시점이 그만큼 뒤로 밀린다", async () => {
    render(<IdleLogout />);
    await flushMicrotasks();
    // 만료 1분 전 활동 → 시계가 리셋된다
    await advance(IDLE_TIMEOUT_MS - 60_000);
    fireEvent.keyDown(window);
    await advance(IDLE_TIMEOUT_MS - 60_000);
    await flushMicrotasks();
    expect(signOut).not.toHaveBeenCalled();
    // 활동 이후로 타임아웃이 다 차면 그때 로그아웃된다
    await advance(2 * IDLE_CHECK_INTERVAL_MS + 60_000);
    await flushMicrotasks();
    expect(signOut).toHaveBeenCalled();
    expect(redirectToIdleLogin).toHaveBeenCalled();
  });

  it("세션이 없으면(비로그인) 아무것도 하지 않는다", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<IdleLogout />);
    await flushMicrotasks();
    await advance(IDLE_TIMEOUT_MS + IDLE_CHECK_INTERVAL_MS);
    await flushMicrotasks();
    expect(signOut).not.toHaveBeenCalled();
    expect(redirectToIdleLogin).not.toHaveBeenCalled();
  });

  it("방치된 채 다시 열린 화면은 마운트 즉시 정리한다", async () => {
    window.localStorage.setItem(
      LAST_ACTIVITY_KEY,
      String(Date.now() - IDLE_TIMEOUT_MS - 1000),
    );
    render(<IdleLogout />);
    await flushMicrotasks();
    expect(signOut).toHaveBeenCalled();
    expect(redirectToIdleLogin).toHaveBeenCalled();
  });

  it("다른 탭의 활동(localStorage 갱신)도 활동으로 인정한다", async () => {
    render(<IdleLogout />);
    await flushMicrotasks();
    await advance(IDLE_TIMEOUT_MS - 60_000);
    // 다른 탭이 방금 활동을 기록했다
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    await advance(IDLE_TIMEOUT_MS - 60_000);
    await flushMicrotasks();
    expect(signOut).not.toHaveBeenCalled();
    expect(redirectToIdleLogin).not.toHaveBeenCalled();
  });

  it("탭이 다시 보이는 순간(visibilitychange)에도 만료를 검사한다", async () => {
    render(<IdleLogout />);
    await flushMicrotasks();
    // 백그라운드에 오래 머문 상황 — 인터벌 없이 저장된 시각만 과거로 민다
    window.localStorage.setItem(
      LAST_ACTIVITY_KEY,
      String(Date.now() - IDLE_TIMEOUT_MS - 1000),
    );
    fireEvent(document, new Event("visibilitychange"));
    await flushMicrotasks();
    expect(signOut).toHaveBeenCalled();
    expect(redirectToIdleLogin).toHaveBeenCalled();
  });
});
