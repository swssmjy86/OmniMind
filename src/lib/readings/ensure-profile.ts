// 구버전 프로필 재계산 트리거(3단계 스펙 §2, 사용자 확정) — 저장된 profile_context.version이
// 현재 엔진보다 낮으면 지금 엔진과 다른 값이므로(CLAUDE.md), 유료 풀이를 그 위에 만들지
// 않는다. 원본 입력(생년월일시 등)은 profiles 행에 있으므로 재계산 가능하다.
import { computeProfile, PROFILE_CONTEXT_VERSION, type ProfileContext } from "@/lib/engine/index";
import type { EngineInput } from "@/lib/engine/types";
import type { ProfileRow } from "@/lib/db/types";

/** profiles 행 → 엔진 입력(순수). birth_time은 "HH:mm:ss"로 저장되어 있어 "HH:MM"로 자른다. */
export function engineInputFromProfile(row: ProfileRow): EngineInput {
  return {
    birthDate: row.birth_date,
    birthTime: row.time_unknown ? null : (row.birth_time ? row.birth_time.slice(0, 5) : null),
    timeUnknown: row.time_unknown,
    bloodType: row.blood_type,
    mbti: row.mbti as EngineInput["mbti"],
    gender:
      row.gender === "male" || row.gender === "female" ? row.gender : undefined,
  };
}

/** update 체인만 쓰는 최소 클라이언트 형태 — 테스트에서 목이 쉽다. */
interface SupabaseLike {
  from(table: string): {
    update(values: Record<string, unknown>): { eq(col: string, v: string): PromiseLike<unknown> };
  };
}

/**
 * 최신 버전이면 그대로, 구버전이면 재계산해 profiles를 갱신(best-effort)하고 최신 ctx를
 * 반환한다. 갱신 실패는 무시 — 화면은 재계산본으로 항상 최신을 쓴다(P9 §12 서비스 우선).
 */
export async function ensureCurrentProfile(
  supabase: SupabaseLike,
  row: ProfileRow,
): Promise<ProfileContext> {
  if (row.profile_context.version >= PROFILE_CONTEXT_VERSION) return row.profile_context;
  const ctx = computeProfile(engineInputFromProfile(row));
  try {
    await supabase.from("profiles").update({ profile_context: ctx }).eq("user_id", row.user_id);
  } catch {
    // 갱신 실패해도 반환값은 최신 — 다음 방문에 다시 시도된다
  }
  return ctx;
}
