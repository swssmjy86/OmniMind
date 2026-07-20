import { describe, expect, it } from "vitest";
import { computeGuestDailyPersonal } from "./actions";

describe("computeGuestDailyPersonal — 비로그인 오늘의운세 개인화 한 줄", () => {
  it("생년월일만으로도 개인화 문장을 낸다", async () => {
    const personal = await computeGuestDailyPersonal("1995-08-20", "");
    expect(typeof personal).toBe("string");
    expect(personal!.length).toBeGreaterThan(0);
  });

  it("태어난 시간까지 있어도 계산이 깨지지 않는다(정확도만 높아짐)", async () => {
    const personal = await computeGuestDailyPersonal("1995-08-20", "23:30");
    expect(typeof personal).toBe("string");
  });

  it("잘못된 입력이면 null — 화면은 공통 문구로 대체된다", async () => {
    expect(await computeGuestDailyPersonal("1995/08/20", "")).toBeNull();
    expect(await computeGuestDailyPersonal("1995-08-20", "99:99")).toBeNull();
  });
});
