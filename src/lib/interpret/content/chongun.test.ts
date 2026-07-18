import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { assembleProfile } from "../templates";
import { checkTone } from "../tone-guard";
import { SEASON_TITLE, assembleChongun } from "./chongun";

// 실제 엔진으로 만든 컨텍스트 — 목이 아닌 진짜 값으로 조립을 검증한다.
const ctx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ", gender: "male",
});
const noGenderCtx = computeProfile({
  birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
  bloodType: "A", mbti: "ENFJ",
});

describe("총운 조립 (2단계 스펙 §4)", () => {
  it("assembleProfile 섹션 전부 + 운의 계절 섹션 하나가 뒤에 붙는다", () => {
    const base = assembleProfile(ctx, "새벽");
    const out = assembleChongun(ctx, "새벽", 36);
    expect(out.slice(0, base.length)).toEqual(base); // 위계·순서 그대로(§3)
    expect(out).toHaveLength(base.length + 1);
    expect(out[out.length - 1].title).toBe(SEASON_TITLE);
    expect(out[out.length - 1].body).toContain("대운");
  });

  it("첫 대운 이전 나이 — 시작 안내 문구", () => {
    const out = assembleChongun(ctx, "새벽", 0);
    expect(out[out.length - 1].body).toContain("첫 대운");
  });

  it("성별 미상(daeun 없음) — 온보딩 안내 문구로 완전 동작(폴백 §3.2)", () => {
    const out = assembleChongun(noGenderCtx, "새벽", 36);
    expect(out[out.length - 1].title).toBe(SEASON_TITLE);
    expect(out[out.length - 1].body).toContain("성별");
  });

  it("운의 계절 문구가 톤 가드를 통과한다", () => {
    for (const age of [0, 36, null]) {
      expect(checkTone(assembleChongun(ctx, "새벽", age).at(-1)!.body)).toEqual([]);
    }
    expect(checkTone(assembleChongun(noGenderCtx, "새벽", 36).at(-1)!.body)).toEqual([]);
  });
});
