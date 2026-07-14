import type { ChatInput, InterpretProvider } from "./provider";
import { tenGodTheme } from "./content/ten-gods";

// LLM 없이도 항상 동작하는 규칙 기반 공감 Provider(0단계).
// 메시지의 결(감정·주제)을 가늠해, 프로필의 기운(일간 오행)을 담아 응답한다. §5.4 문체.

type Mood = "위로" | "고민" | "관계" | "기쁨" | "일상";

const KEYWORDS: Record<Exclude<Mood, "일상">, RegExp> = {
  위로: /힘들|지쳐|지친|피곤|우울|슬퍼|슬프|외로|불안|걱정|눈물|괴로|버겁|막막/,
  고민: /고민|선택|결정|할까|해야|망설|갈등|어떡|어떻게 해|모르겠/,
  관계: /친구|연인|남친|여친|가족|엄마|아빠|사람|관계|싸웠|서운|미워|헤어/,
  기쁨: /좋아|행복|기뻐|기쁘|신나|설레|잘됐|성공|합격|해냈|뿌듯/,
};

export function detectMood(message: string): Mood {
  for (const [mood, re] of Object.entries(KEYWORDS) as [Exclude<Mood, "일상">, RegExp][]) {
    if (re.test(message)) return mood;
  }
  return "일상";
}

const OPENER: Record<Mood, string> = {
  위로: "그런 마음이 드는 하루였군요. 먼저 그 마음을 알아차린 것만으로도 충분해요.",
  고민: "혼자 짊어지기 무거운 고민이었겠어요. 천천히 함께 들여다봐요.",
  관계: "사람 사이의 일은 늘 마음을 많이 쓰게 되죠. 그 마음이 참 다정하네요.",
  기쁨: "그 소식을 들으니 저까지 마음이 환해져요. 정말 잘됐어요.",
  일상: "오늘의 이야기를 들려줘서 고마워요.",
};

const CLOSER: Record<Mood, string> = {
  위로: "오늘은 무엇도 더 하려 애쓰지 말고, 그저 당신을 아껴주면 좋겠어요.",
  고민: "정답을 서둘러 찾기보다, 마음이 향하는 쪽을 가만히 살펴봐요.",
  관계: "당신의 진심은 언젠가 결국 닿을 거예요.",
  기쁨: "이 기쁨을 오래오래 곁에 두어요.",
  일상: "내일도 당신다운 하루가 되길 바라요.",
};

export class TemplateProvider implements InterpretProvider {
  async chat(input: ChatInput): Promise<string> {
    const mood = detectMood(input.message);
    const el = input.profile.dayMaster.element;
    const talent = tenGodTheme(input.profile.tenGods).split(".")[0];
    const bridge =
      mood === "일상"
        ? `${el}의 기운을 지닌 ${input.nickname}님답게, 오늘의 결을 그대로 따라가 봐요.`
        : `${el}의 기운을 타고난 ${input.nickname}님에게는 ${talent}. 그 힘이 지금의 당신도 지켜줄 거예요.`;
    return `${OPENER[mood]} ${bridge} ${CLOSER[mood]}`;
  }
}
