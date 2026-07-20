import type { FourPillarSinsal, Sinsal } from "@/lib/engine/twelve-sinsal";

// 십이신살 중 성향 키워드로 쓰기 좋은 세 갈래(역마·년살(도화)·화개)만 문구화한다.
// 나머지 9갈래(겁살·재살·천살·월살·망신살·장성살·반안살·육해살)는 특정 사건·시기 예측에
// 가까워 지금은 다루지 않는다(§P3 이후 검토).
const FLAVOR_TEXT: Partial<Record<Sinsal, string>> = {
  역마살: "이동과 변화의 기운이 함께해요. 한자리에 머무르기보다 움직이고 옮겨 다닐 때 오히려 생기가 도는 결이죠.",
  년살: "사람을 끌어당기는 매력의 기운이 있어요. 곁에 사람이 모이고, 인연이 자연스레 이어지는 결이죠.",
  화개살: "고요히 파고드는 창작과 사색의 기운이 있어요. 홀로 몰입하는 시간에서 오히려 깊어지는 결이죠.",
};

const PALACE_LABEL: Record<keyof FourPillarSinsal, string> = {
  year: "조상궁", month: "부모궁", day: "나 자신", hour: "자녀궁",
};

/**
 * 네 기둥 중 역마·도화(년살)·화개가 있는 자리를 찾아 문구로 엮는다.
 * 어디에도 없으면 null — 호출부가 조용히 생략한다(단정 회피, 있는 것만 말한다).
 */
export function sinsalText(sinsal: FourPillarSinsal): string | null {
  const hits: string[] = [];
  for (const key of ["year", "month", "day", "hour"] as const) {
    const s = sinsal[key];
    if (!s) continue;
    const text = FLAVOR_TEXT[s];
    if (text) hits.push(`${PALACE_LABEL[key]}에 ${text}`);
  }
  if (hits.length === 0) return null;
  return hits.join(" ");
}
