"use client";

import PersonaIntro from "./PersonaIntro";
import PersonaImageIntro from "./PersonaImageIntro";
import { PERSONA_VIDEOS } from "@/lib/persona/videos";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import type { PersonaId } from "@/lib/persona/personas";

/**
 * 페르소나 인사 오버레이 — 영상이 있는 페르소나(PERSONA_VIDEOS)는 목소리까지 담긴
 * 인트로 영상으로, 아직 없는 페르소나는 전신 일러스트 정지 화면으로 자동 분기한다.
 * 사주 상품 페이지(총운·직업운·연애운·궁합·재물운·결혼운)가 이 한 컴포넌트만 쓰면
 * 영상 제작 여부에 따라 알아서 영상/이미지가 정해진다 — 페이지는 페르소나만 넘긴다.
 *
 * 영상 인트로는 8초 뒤(또는 건너뛰기·완주) 스스로 걷힌다. 입력 시트는 각 페이지의
 * 리딩 뷰가 독립적으로 관리하므로 여기서 onClose로 조율하지 않는다(정지 화면과 동일).
 */
export default function PersonaGreetingIntro({
  personaId,
  eyebrow,
  line,
}: {
  personaId: PersonaId;
  eyebrow: string;
  line: string;
}) {
  const video = PERSONA_VIDEOS[personaId];
  if (video) {
    return (
      <PersonaIntro personaId={personaId} eyebrow={eyebrow} line={line} src={video} />
    );
  }

  const image = PERSONA_IMAGES[personaId];
  return (
    <PersonaImageIntro
      personaId={personaId}
      eyebrow={eyebrow}
      line={line}
      image={image.full}
      imagePosition={image.fullPosition}
    />
  );
}
