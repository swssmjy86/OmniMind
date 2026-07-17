import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom엔 scrollIntoView가 없다 — 채팅 등 자동 스크롤 컴포넌트 렌더 시 TypeError로 죽는 것을 막는다.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
