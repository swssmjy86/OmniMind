import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "./types";
import { DAY_MASTER_TEXT } from "./content/day-master";
import { ELEMENT_BALANCE_TEXT } from "./content/elements";
import { tenGodTheme } from "./content/ten-gods";
import { MBTI_AXIS_TEXT } from "./content/mbti";
import { BLOOD_TEXT } from "./content/blood";
import { ZODIAC_TEXT } from "./content/zodiac";

/**
 * "온전한 나" 프로필을 결정론적으로 조립한다(템플릿 0단계, 항상 동작·0원).
 * 6섹션: 인사 → 타고난 결(일간) → 마음의 균형(오행) → 타고난 재능(십성)
 *        → 겉과 속(MBTI·혈액형) → 맺음.
 * 실제 계산된 사주(일간·오행 분포·십성)를 반영해 깊이를 더한다.
 * 어떤 조합이 와도 누락·빈 문구 없이 완성된다.
 */
export function assembleProfile(
  ctx: ProfileContext,
  nickname: string,
): InterpretationSection[] {
  const dm = DAY_MASTER_TEXT[ctx.dayMaster.stem];
  const balance = ELEMENT_BALANCE_TEXT(ctx.elements);
  const talent = tenGodTheme(ctx.tenGods);
  const mbti = MBTI_AXIS_TEXT(ctx.mbti);
  const blood = BLOOD_TEXT[ctx.blood.type];
  const zodiac = ZODIAC_TEXT[ctx.zodiac];

  return [
    {
      title: "당신을 만나서",
      body: `${nickname}님, ${zodiac.intro}`,
    },
    {
      title: "타고난 결",
      body: `사주의 중심이 되는 일간은 '${ctx.dayMaster.stem}', ${ctx.dayMaster.element}의 기운을 타고났어요. ${dm.body}`,
    },
    {
      title: "마음의 균형",
      body: balance,
    },
    {
      title: "타고난 재능과 관계",
      body: talent,
    },
    {
      title: "겉과 속",
      body: `겉으로 보이는 ${ctx.mbti.type}의 모습으로는, ${mbti} 여기에 ${ctx.blood.type}형 특유의 결이 더해져, ${blood.body}`,
    },
    {
      title: "그리고, 앞으로",
      body: `${nickname}님을 이루는 조각들은 이렇게 서로를 비추며 하나의 이야기가 돼요. 오늘의 당신도, 내일의 당신도 충분히 당신다우니, 그 결을 믿고 천천히 걸어가 보아요.`,
    },
  ];
}
