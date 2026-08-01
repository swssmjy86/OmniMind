// 페르소나 음성 — 브라우저 내장 음성합성(Web Speech API)으로 각 페르소나의 멘트를 소리로
// 읽는다. 외부 API·오디오 파일 없이 클라이언트에서 즉석 생성한다(월 고정비 0원 원칙).
//
// "AI스럽지 않게" 원칙:
// - 과한 pitch 왜곡은 아무리 좋은 음성도 로봇처럼 만든다 → pitch는 1.0 근처로만 은은하게.
// - 성별은 실제 음성 선택으로 낸다: 기기에 성별에 맞는 한국어 음성이 있으면 그걸 고른다
//   (모바일 iOS·안드로이드는 Siri·Google 신경망 음성이라 사람 목소리에 가깝다).
//   성별 음성이 없을 때만(대개 한국어 음성 하나뿐) 적당한 pitch로 남/여를 암시한다.
// - 되도록 고음질(신경망/향상형) 음성을 고르고, 저품질 'compact/eloquence'는 피한다.
//
// 성별(일러스트 기준) — 남: 달지기·금오 / 여: 서온·벼리·홍연·연리·온새.
import type { PersonaId } from "./personas";

type Gender = "male" | "female";

// 페르소나 개성(말투·나이대) — pitch는 1.0 근처로만, rate로 리듬을 준다.
const VOICE: Record<PersonaId, { gender: Gender; pitch: number; rate: number }> = {
  dalzigi: { gender: "male", pitch: 1.0, rate: 0.96 }, // 등불 문지기(남) — 차분하고 따뜻하게
  geumo: { gender: "male", pitch: 0.97, rate: 0.95 }, // 금까마귀(남) — 낮고 호쾌하게(하오체)
  seoon: { gender: "female", pitch: 1.0, rate: 0.95 }, // 서고지기(여) — 차분하게
  byeori: { gender: "female", pitch: 1.0, rate: 1.0 }, // 대장장이(여) — 짧고 또렷하게
  hongyeon: { gender: "female", pitch: 1.05, rate: 1.06 }, // 반말(여) — 밝고 조금 빠르게
  yeonri: { gender: "female", pitch: 1.0, rate: 0.95 }, // 정원사(여) — 그윽하게
  onsae: { gender: "female", pitch: 0.98, rate: 0.88 }, // 할머니(여) — 곱고 느리게
};

// 성별 음성을 못 찾았을 때만 pitch로 성별을 암시하는 보정폭(과하지 않게).
const FALLBACK_PITCH: Record<Gender, number> = { male: -0.15, female: 0.1 };

// 한국어 음성 이름에서 성별을 가늠하는 힌트(OS·브라우저마다 목소리가 다르다).
const MALE_HINTS = ["injoon", "male", "남성", "남자", "준", "민준", "현우", "지훈"];
const FEMALE_HINTS = ["yuna", "heami", "sunhi", "female", "여성", "여자", "유나", "서현", "나리"];
// 저품질(로봇 느낌) 음성 이름 — 가급적 피한다.
const LOW_QUALITY = ["compact", "eloquence"];

/** 이 브라우저가 음성합성을 지원하는지. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const has = (v: SpeechSynthesisVoice, hints: string[]) =>
  hints.some((h) => v.name.toLowerCase().includes(h));

// 성별에 맞는 한국어 음성을 고른다. 반환값의 matched로 "진짜 성별 음성을 찾았는지"를 알려
// 호출부가 pitch 보정 여부를 정한다. 고음질 우선, 저품질은 뒤로. voices는 비동기 로드라 매번 최신.
function pickKoreanVoice(gender: Gender): { voice: SpeechSynthesisVoice | null; matched: boolean } {
  const ko = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (!ko.length) return { voice: null, matched: false };

  // 저품질 음성은 후순위로.
  const ranked = [...ko].sort(
    (a, b) => Number(has(a, LOW_QUALITY)) - Number(has(b, LOW_QUALITY)),
  );

  const want = gender === "male" ? MALE_HINTS : FEMALE_HINTS;
  const avoid = gender === "male" ? FEMALE_HINTS : MALE_HINTS;

  const genderMatch = ranked.find((v) => has(v, want));
  if (genderMatch) return { voice: genderMatch, matched: true };

  // 성별 음성이 없다 → 반대 성별로 이름난 음성은 피한 중립 음성(성별은 pitch가 맡는다).
  const neutral = ranked.find((v) => !has(v, avoid)) ?? ranked[0];
  return { voice: neutral, matched: false };
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

    const { gender, pitch, rate } = VOICE[personaId] ?? { gender: "female" as Gender, pitch: 1, rate: 1 };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = rate;

    // 음성 지정만 별도로 감싼다 — 실패해도 기본 음성 + pitch로 읽는다.
    let matched = false;
    try {
      const picked = pickKoreanVoice(gender);
      if (picked.voice) u.voice = picked.voice;
      matched = picked.matched;
    } catch {
      /* 음성 지정 실패는 무시 */
    }
    // 진짜 성별 음성을 찾았으면 pitch는 개성만(자연스럽게). 못 찾았을 때만 성별 보정을 얹는다.
    u.pitch = pitch + (matched ? 0 : FALLBACK_PITCH[gender]);

    synth.speak(u);
  } catch {
    /* 음성합성 자체가 막힌 환경 — 조용히 넘어간다 */
  }
}

/** 진행 중인 발화를 멈춘다(화면 이탈 등). */
export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
