import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "./templates";
import { checkTone } from "./tone-guard";
import { CASES } from "@/lib/engine/fixtures/manseryeok-cases";

describe("assembleProfile", () => {
  it.each(CASES.map((c) => c.input))(
    "모든 코퍼스 입력에서 6섹션·비지 않음·닉네임 삽입·톤 통과",
    (input) => {
      const ctx = computeProfile(input);
      const sections = assembleProfile(ctx, "다인");
      expect(sections).toHaveLength(6);
      for (const s of sections) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(s.body.trim().length).toBeGreaterThan(0);
        expect(checkTone(s.body)).toHaveLength(0); // 조립 결과도 톤 통과
      }
      expect(sections[0].body).toContain("다인");
      expect(sections[sections.length - 1].body).toContain("다인");
      // 실제 사주 데이터 반영: 일간이 '타고난 결'에 노출
      expect(sections[1].body).toContain(ctx.dayMaster.stem);
    },
  );

  it("timeUnknown 프로필도 정상 조립된다(6섹션)", () => {
    const ctx = computeProfile({
      birthDate: "1988-12-31", birthTime: null, timeUnknown: true,
      bloodType: "AB", mbti: "ESTP",
    });
    const sections = assembleProfile(ctx, "하늘");
    expect(sections).toHaveLength(6);
  });
});
