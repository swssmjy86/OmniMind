import { describe, expect, it } from "vitest";
import { currentMilestone, isMilestoneToday } from "./milestone";

describe("마일스톤", () => {
  it("도달 전에는 배지 없음", () => {
    expect(currentMilestone(1)).toBeNull();
    expect(currentMilestone(6)).toBeNull();
  });
  it("7일부터 새싹, 30일부터 잎, 100일부터 나무, 365일부터 숲", () => {
    expect(currentMilestone(7)?.label).toBe("새싹");
    expect(currentMilestone(29)?.label).toBe("새싹");
    expect(currentMilestone(30)?.label).toBe("잎");
    expect(currentMilestone(100)?.label).toBe("나무");
    expect(currentMilestone(400)?.label).toBe("숲");
  });
  it("당일 판정", () => {
    expect(isMilestoneToday(7)?.label).toBe("새싹");
    expect(isMilestoneToday(8)).toBeNull();
    expect(isMilestoneToday(365)?.emoji).toBe("🌲");
  });
});
