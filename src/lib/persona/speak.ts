// 페르소나 음성 — 브라우저 내장 음성합성(Web Speech API)으로 각 페르소나의 멘트를 소리로
// 읽는다. 외부 API·오디오 파일 없이 클라이언트에서 즉석 생성한다(월 고정비 0원 원칙).
//
// 남/여 목소리: 일러스트 기준으로 성별을 정해(남: 달지기·금오 / 여: 서온·벼리·홍연·연리·온새),
// ① 기기에 성별에 맞는 한국어 음성이 있으면 그 음성을 고르고, ② 없으면(한국어 음성이 보통
// 하나뿐이라) 성별에 맞춰 pitch를 확실히 갈라 남/여로 들리게 한다. 여기에 말투·나이대까지
// 얹어 페르소나마다 개성을 준다.
import type { PersonaId } from "./personas";

type Gender = "male" | "female";

// pitch: 0~2(기본 1), rate: 0.1~10(기본 1).
const VOICE: Record<PersonaId, { gender: Gender; pitch: number; rate: number }> = {
  dalzigi: { gender: "male", pitch: 0.9, rate: 0.95 }, // 등불 문지기(남) — 차분하고 따뜻하게
  geumo: { gender: "male", pitch: 0.72, rate: 0.9 }, // 금까마귀(남) — 낮고 호쾌하게(하오체)
  seoon: { gender: "female", pitch: 1.05, rate: 0.92 }, // 서고지기(여) — 차분하게
  byeori: { gender: "female", pitch: 1.1, rate: 1.0 }, // 대장장이(여) — 짧고 또렷하게
  hongyeon: { gender: "female", pitch: 1.25, rate: 1.08 }, // 반말(여) — 밝고 조금 빠르게
  yeonri: { gender: "female", pitch: 1.12, rate: 0.94 }, // 정원사(여) — 그윽하게
  onsae: { gender: "female", pitch: 1.0, rate: 0.85 }, // 할머니(여) — 곱고 느리게
};

// 한국어 음성 이름에서 성별을 가늠하는 힌트(OS·브라우저마다 목소리가 다르다).
const MALE_HINTS = ["injoon", "male", "남성", "남자", "준", "민준", "현우", "지훈"];
const FEMALE_HINTS = ["yuna", "heami", "sunhi", "female", "여성", "여자", "유나", "서현", "나리"];

/** 이 브라우저가 음성합성을 지원하는지. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// 성별에 맞는 한국어 음성을 고른다. 딱 맞는 게 없으면, 반대 성별로 이름난 음성은 피하고
// 중립 한국어 음성을 쓴다(성별 느낌은 pitch가 맡는다). voices는 비동기 로드라 매번 최신 목록에서.
function pickKoreanVoice(gender: Gender): SpeechSynthesisVoice | null {
  const ko = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (!ko.length) return null;

  const want = gender === "male" ? MALE_HINTS : FEMALE_HINTS;
  const avoid = gender === "male" ? FEMALE_HINTS : MALE_HINTS;
  const named = (v: SpeechSynthesisVoice, hints: string[]) =>
    hints.some((h) => v.name.toLowerCase().includes(h));

  return (
    ko.find((v) => named(v, want)) ??
    ko.find((v) => !named(v, avoid)) ??
    ko[0]
  );
}

/**
 * 페르소나의 멘트를 소리로 읽는다. 진행 중이던 발화는 끊고 새로 시작한다(카드 연속 클릭 대비).
 * reduced-motion을 켠 사용자는 소리도 원치 않을 가능성이 커 조용히 건너뛴다.
 * 반드시 사용자 클릭 같은 제스처 안에서 호출해야 브라우저 자동재생 정책에 막히지 않는다.
 */
export function speakPersonaLine(personaId: PersonaId, text: string): void {
  if (!canSpeak() || !text) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  // Web Speech는 브라우저·OS마다 구현이 제각각이라(음성 지정 실패 등) 방어적으로 감싼다 —
  // 발화가 실패해도 카드 이동(클릭 핸들러)까지 깨지면 안 된다.
  try {
    const synth = window.speechSynthesis;
    synth.cancel(); // 이전 발화 중단

    const { gender, pitch, rate } = VOICE[personaId] ?? { gender: "female", pitch: 1, rate: 1 };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.pitch = pitch;
    u.rate = rate;
    // 음성 지정만 별도로 감싼다 — 실패해도 기본 음성 + pitch로 읽는다(성별 느낌은 pitch가 유지).
    try {
      const voice = pickKoreanVoice(gender);
      if (voice) u.voice = voice;
    } catch {
      /* 음성 지정 실패는 무시 */
    }
    synth.speak(u);
  } catch {
    /* 음성합성 자체가 막힌 환경 — 조용히 넘어간다 */
  }
}

/** 진행 중인 발화를 멈춘다(화면 이탈 등). */
export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
