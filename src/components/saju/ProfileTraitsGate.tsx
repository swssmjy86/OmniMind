"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReadingInputSheet, { type ReadingSheetValues } from "@/components/saju/ReadingInputSheet";
import { saveProfileTraits } from "@/lib/readings/traits-actions";
import type { PersonaId } from "@/lib/persona/personas";

/**
 * 로그인+프로필 사용자의 보조축(MBTI·혈액형) 관문 — 프로필에 두 값이 없으면 풀이 대신
 * 이 게이트가 렌더되어 시트(특성 모드)를 띄운다. 저장 성공 시 refresh로 서버 페이지가
 * 다시 그려져 풀이가 나타난다.
 */
export default function ProfileTraitsGate({ personaId }: { personaId: PersonaId }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  const onSubmit = async (v: ReadingSheetValues) => {
    const r = await saveProfileTraits({ mbti: v.mbti, blood: v.blood });
    if (r.ok) router.refresh();
    else setFailed(true);
  };

  return (
    <>
      {failed && (
        <p className="mt-6 text-center text-sm text-text-soft">
          저장이 잠시 어긋났어요. 다시 한번 시도해 주시겠어요?
        </p>
      )}
      <ReadingInputSheet mode="traits" personaId={personaId} onSubmit={onSubmit} />
    </>
  );
}
