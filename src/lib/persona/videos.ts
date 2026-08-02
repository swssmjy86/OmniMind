// 페르소나 인트로 영상 경로 — 표현 계층 순수 상수(images.ts와 같은 원칙: 계산에 무관).
//
// 영상은 `docs/`의 원본 mp4를 웹용으로 압축(H.264 720×1280·AAC·+faststart, ~0.8–1MB)해
// public/videos/에 커밋한다. 정적 일러스트(PERSONA_IMAGES)보다 무겁지만, 인트로는 페르소나를
// 처음 만나는 핵심 콘텐츠라 목소리까지 담은 영상으로 소개한다.
//
// 영상이 있는 페르소나만 이 표에 오른다 — 없는 페르소나는 PERSONA_IMAGES 정지 화면으로
// 폴백한다(PersonaGreetingIntro가 분기). "월 고정비 0원" 원칙: Vercel 이미지 최적화 대신
// 빌드 타임에 미리 압축해 그대로 서빙한다.

import type { PersonaId } from "./personas";

export const PERSONA_VIDEOS: Partial<Record<PersonaId, string>> = {
  dalzigi: "/videos/dalzigi-intro.mp4",
  seoon: "/videos/seoon-intro.mp4",
  byeori: "/videos/byeori-intro.mp4",
  hongyeon: "/videos/hongyeon-intro.mp4",
};
