import { describe, it, expect, beforeEach, vi } from "vitest";
import { speakPersonaLine, canSpeak, stopSpeaking } from "./speak";

// jsdom엔 Web Speech API가 없어 최소 목을 심는다.
let spoken: { text: string; lang: string; pitch: number; rate: number; voiceName: string | null }[];
let cancelCalls: number;
let voices: { name: string; lang: string }[];

beforeEach(() => {
  spoken = [];
  cancelCalls = 0;
  voices = [];
  class U {
    text: string;
    lang = "";
    pitch = 1;
    rate = 1;
    voice: { name: string } | null = null;
    constructor(t: string) { this.text = t; }
  }
  globalThis.SpeechSynthesisUtterance = U as unknown as typeof SpeechSynthesisUtterance;
  const synthMock = {
    speak(u: SpeechSynthesisUtterance) {
      spoken.push({
        text: u.text, lang: u.lang, pitch: u.pitch, rate: u.rate,
        voiceName: u.voice?.name ?? null,
      });
    },
    cancel() { cancelCalls += 1; },
    getVoices: () => voices as unknown as SpeechSynthesisVoice[],
  };
  window.speechSynthesis = synthMock as unknown as SpeechSynthesis;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe("speakPersonaLine", () => {
  it("한국어로, 이전 발화를 끊고 새로 읽는다", () => {
    speakPersonaLine("dalzigi", "오늘의 기운, 함께 볼까요?");
    expect(cancelCalls).toBe(1);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].lang).toBe("ko-KR");
    expect(spoken[0].text).toContain("기운");
  });

  it("성별 음성이 없으면 pitch로 성별을 암시한다 — 남은 낮게, 여는 높게", () => {
    // voices 비어 있음(성별 매칭 실패) → 보정 pitch 적용
    speakPersonaLine("geumo", "재물의 물길, 훤히 보이오.");
    speakPersonaLine("dalzigi", "오늘의 기운, 함께 볼까요?");
    speakPersonaLine("hongyeon", "실은 이미 이어져 있어.");
    speakPersonaLine("seoon", "서고에 이미 닿아 있어요.");
    expect(spoken[0].pitch).toBeLessThan(1); // 금오(남)
    expect(spoken[1].pitch).toBeLessThan(1); // 달지기(남)
    expect(spoken[2].pitch).toBeGreaterThan(1); // 홍연(여)
    expect(spoken[3].pitch).toBeGreaterThan(1); // 서온(여)
  });

  it("성별에 맞는 음성이 있으면 그 음성을 고르고, pitch는 자연스럽게(왜곡 최소)", () => {
    voices = [
      { name: "Yuna", lang: "ko-KR" }, // 여성
      { name: "Microsoft InJoon", lang: "ko-KR" }, // 남성
    ];
    speakPersonaLine("geumo", "재물의 물길."); // 남
    speakPersonaLine("hongyeon", "실은 이어져 있어."); // 여
    expect(spoken[0].voiceName).toBe("Microsoft InJoon");
    expect(spoken[1].voiceName).toBe("Yuna");
    // 진짜 성별 음성을 찾았으니 pitch 보정을 얹지 않는다 → 1.0 근처(자연스러움)
    expect(spoken[0].pitch).toBeGreaterThan(0.9);
    expect(spoken[1].pitch).toBeLessThan(1.1);
  });

  it("'female' 이름 음성을 남성으로 오인하지 않는다(부분문자열 male 버그)", () => {
    voices = [{ name: "Korean Female", lang: "ko-KR" }]; // 남성 음성 없음
    speakPersonaLine("geumo", "재물의 물길."); // 남
    // 여성 음성을 남성으로 매칭하면 안 된다 → 매칭 실패로 보정 pitch(낮게)가 적용돼야 한다
    expect(spoken[0].pitch).toBeLessThan(1);
  });

  it("신경망(고음질) 음성을 일반·compact보다 우선한다", () => {
    voices = [
      { name: "Korean (Compact)", lang: "ko-KR" },
      { name: "Google 한국의", lang: "ko-KR" }, // 신경망(google)
      { name: "Some Korean", lang: "ko-KR" },
    ];
    speakPersonaLine("seoon", "서고에 닿아 있어요.");
    expect(spoken[0].voiceName).toBe("Google 한국의");
  });

  it("빈 문자열은 발화하지 않는다", () => {
    speakPersonaLine("seoon", "");
    expect(spoken).toHaveLength(0);
  });

  it("reduced-motion이어도 소리는 난다(오디오는 모션 선호와 무관, 클릭 재생)", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    speakPersonaLine("dalzigi", "안녕하세요");
    expect(spoken).toHaveLength(1);
  });

  it("canSpeak/stopSpeaking이 동작한다", () => {
    expect(canSpeak()).toBe(true);
    stopSpeaking();
    expect(cancelCalls).toBe(1);
  });
});
