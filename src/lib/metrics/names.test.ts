import { describe, it, expect } from "vitest";
import { CLIENT_EVENTS, isClientEvent } from "./names";

describe("isClientEvent", () => {
  it("화이트리스트 이벤트만 허용한다", () => {
    for (const name of CLIENT_EVENTS) expect(isClientEvent(name)).toBe(true);
  });

  it("서버 전용·임의 이름은 거른다", () => {
    expect(isClientEvent("onboard_complete")).toBe(false);
    expect(isClientEvent("drop table events")).toBe(false);
    expect(isClientEvent("")).toBe(false);
  });
});
