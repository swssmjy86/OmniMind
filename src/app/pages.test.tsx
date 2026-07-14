import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConcernPage from "./(tabs)/concern/page";

// 홈(/)·나(/me)·마음(/mind)은 Supabase 세션을 읽는 async 서버 컴포넌트라
// 동기 스모크 렌더 대상에서 제외한다(흐름 검증은 E2E).
describe("탭 페이지 렌더", () => {
  it("고민 페이지가 제목을 렌더한다", () => {
    render(<ConcernPage />);
    expect(screen.getByRole("heading", { name: "고민" })).toBeInTheDocument();
  });
});
