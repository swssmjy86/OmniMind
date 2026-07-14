import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConcernPage from "./(tabs)/concern/page";
import MindPage from "./(tabs)/mind/page";

// 홈(/)·나(/me)는 Supabase 세션을 읽는 async 서버 컴포넌트라
// 동기 스모크 렌더 대상에서 제외한다(흐름 검증은 E2E, P2-8).
describe("탭 페이지 렌더", () => {
  it.each([
    [ConcernPage, "고민"],
    [MindPage, "마음"],
  ])("페이지가 제목을 렌더한다: %#", (Page, heading) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  });
});
