// 프로필 행 → 보조축(MBTI·혈액형) 추출 — 로그인 풀이 경로(페이지·액션)가 같은 규칙을 쓴다.
// "use server" 파일의 export는 전부 네트워크 노출 액션이 되므로 별도 일반 모듈에 둔다.
import { normalizeMbti, isBloodType, type Traits } from "@/lib/interpret/content/traits";
import type { ProfileRow } from "@/lib/db/types";

/** 저장된 프로필의 보조축 — 형식이 어긋난 값은 조용히 버린다(풀이를 깨지 않는다). */
export function profileTraits(profile: ProfileRow): Traits {
  const blood = profile.blood_type ?? null;
  return {
    mbti: normalizeMbti(profile.mbti),
    blood: blood && isBloodType(blood) ? blood : null,
  };
}

/** 풀이 진입에 필요한 보조축이 아직 비어 있는지 — 입력 시트(특성 모드)를 띄울 조건. */
export function traitsMissing(profile: ProfileRow): boolean {
  const t = profileTraits(profile);
  return !t.mbti || !t.blood;
}
