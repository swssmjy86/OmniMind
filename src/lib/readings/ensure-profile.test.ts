import { describe, expect, it, vi } from "vitest";
import { PROFILE_CONTEXT_VERSION, computeProfile } from "@/lib/engine/index";
import type { ProfileRow } from "@/lib/db/types";
import { engineInputFromProfile, ensureCurrentProfile } from "./ensure-profile";

const baseRow = {
  user_id: "u1", nickname: "새벽",
  birth_date: "1990-06-15", birth_time: "07:30:00", time_unknown: false,
  blood_type: "A", mbti: "ENFJ", gender: "male",
  created_at: "", updated_at: "",
} as unknown as ProfileRow;

describe("engineInputFromProfile (스펙 §2 — 순수 변환)", () => {
  it("HH:mm:ss → HH:MM, 필드 매핑", () => {
    expect(engineInputFromProfile(baseRow)).toEqual({
      birthDate: "1990-06-15", birthTime: "07:30", timeUnknown: false,
      gender: "male",
    });
  });

  it("시간 미상·성별 없음 처리", () => {
    const row = { ...baseRow, birth_time: null, time_unknown: true, gender: null } as ProfileRow;
    const input = engineInputFromProfile(row);
    expect(input.timeUnknown).toBe(true);
    expect(input.birthTime).toBeNull();
    expect(input.gender).toBeUndefined();
  });
});

describe("ensureCurrentProfile (스펙 §2 — 재계산 트리거)", () => {
  const freshCtx = computeProfile(engineInputFromProfile(baseRow));

  const supabaseMock = () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return { client: { from } as never, from, update, eq };
  };

  it("현재 버전이면 재계산·갱신 없이 그대로 반환한다", async () => {
    const m = supabaseMock();
    const row = { ...baseRow, profile_context: freshCtx } as ProfileRow;
    const out = await ensureCurrentProfile(m.client, row);
    expect(out).toBe(freshCtx);
    expect(m.from).not.toHaveBeenCalled();
  });

  it("구버전이면 재계산해 최신 버전으로 갱신·반환한다", async () => {
    const m = supabaseMock();
    const stale = { ...freshCtx, version: PROFILE_CONTEXT_VERSION - 1 };
    const row = { ...baseRow, profile_context: stale } as ProfileRow;
    const out = await ensureCurrentProfile(m.client, row);
    expect(out.version).toBe(PROFILE_CONTEXT_VERSION);
    expect(m.from).toHaveBeenCalledWith("profiles");
    expect(m.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("행 갱신 실패는 무시하고 재계산본을 반환한다(best-effort)", async () => {
    const eq = vi.fn().mockRejectedValue(new Error("db down"));
    const client = { from: () => ({ update: () => ({ eq }) }) } as never;
    const stale = { ...freshCtx, version: PROFILE_CONTEXT_VERSION - 1 };
    const out = await ensureCurrentProfile(client, { ...baseRow, profile_context: stale } as ProfileRow);
    expect(out.version).toBe(PROFILE_CONTEXT_VERSION);
  });
});
