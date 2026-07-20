import { describe, expect, it } from "vitest";
import { sinsalText } from "./sinsal";
import { checkTone, checkToneWarnings } from "../tone-guard";
import type { FourPillarSinsal } from "@/lib/engine/twelve-sinsal";

const empty: FourPillarSinsal = { year: "겁살", month: "재살", day: "천살", hour: "월살" };

describe("sinsalText — 역마·도화(년살)·화개만 문구화", () => {
  it("셋 다 없으면 null", () => {
    expect(sinsalText(empty)).toBeNull();
  });

  it("역마살이 있으면 문구에 담기고 톤 통과", () => {
    const s: FourPillarSinsal = { ...empty, hour: "역마살" };
    const t = sinsalText(s);
    expect(t).not.toBeNull();
    expect(t).toContain("자녀궁");
    expect(checkTone(t!)).toHaveLength(0);
    expect(checkToneWarnings(t!)).toHaveLength(0);
  });

  it("년살(도화)이 있으면 문구에 담기고 톤 통과", () => {
    const s: FourPillarSinsal = { ...empty, day: "년살" };
    const t = sinsalText(s);
    expect(t).toContain("나 자신");
    expect(checkTone(t!)).toHaveLength(0);
  });

  it("화개살이 있으면 문구에 담기고 톤 통과", () => {
    const s: FourPillarSinsal = { ...empty, year: "화개살" };
    const t = sinsalText(s);
    expect(t).toContain("조상궁");
    expect(checkTone(t!)).toHaveLength(0);
  });

  it("여러 궁에 겹치면 전부 이어붙인다", () => {
    const s: FourPillarSinsal = { year: "역마살", month: "년살", day: "화개살", hour: "장성살" };
    const t = sinsalText(s);
    expect(t).toContain("조상궁");
    expect(t).toContain("부모궁");
    expect(t).toContain("나 자신");
    expect(checkTone(t!)).toHaveLength(0);
  });

  it("hour가 null(시간 미상)이어도 예외 없이 동작한다", () => {
    const s: FourPillarSinsal = { year: "역마살", month: "재살", day: "천살", hour: null };
    expect(() => sinsalText(s)).not.toThrow();
    expect(sinsalText(s)).toContain("조상궁");
  });
});
