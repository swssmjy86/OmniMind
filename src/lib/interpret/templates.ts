import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "./types";
import { DAY_MASTER_TEXT } from "./content/day-master";
import { ELEMENT_BALANCE_TEXT } from "./content/elements";
import { MBTI_AXIS_TEXT } from "./content/mbti";
import { BLOOD_TEXT } from "./content/blood";
import { ZODIAC_TEXT } from "./content/zodiac";

/**
 * "온전한 나" 프로필을 결정론적으로 조립한다(템플릿 0단계, 항상 동작·0원).
 * 5섹션: 인사 → 타고난 결 → 마음의 균형 → 겉과 속 → 맺음.
 * 어떤 조합이 와도 누락·빈 문구 없이 완성된다.
 */
export function assembleProfile(
  ctx: ProfileContext,
  nickname: string,
): InterpretationSection[] {
  const dm = DAY_MASTER_TEXT[ctx.dayMaster.stem];
  const balance = ELEMENT_BALANCE_TEXT(ctx.elements);
  const mbti = MBTI_AXIS_TEXT(ctx.mbti);
  const blood = BLOOD_TEXT[ctx.blood.type];
  const zodiac = ZODIAC_TEXT[ctx.zodiac];

  return [
    { title: "당신을 만나서", body: `${nickname}님, ${zodiac.intro}` },
    { title: "타고난 결", body: dm.body },
    { title: "마음의 균형", body: balance },
    { title: "겉과 속", body: `${mbti} ${blood.body}` },
    {
      title: "그리고, 앞으로",
      body: `${nickname}님의 이야기는 이제 막 시작이에요. 오늘도 당신다운 하루가 되길 바라요.`,
    },
  ];
}
