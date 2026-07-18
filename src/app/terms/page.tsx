import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관 — 옴니마인드" };

// §9.3 이용약관 — 개발 단계 초안. 코드를 아는 지금 쓰는 초안이 정식 오픈 시 법률 검토의
// 재료가 된다. 오픈 시 상단 표기를 제거한다(§9.4 체크리스트).
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 서비스의 정의",
    body: [
      "옴니마인드는 이용자가 입력한 생년월일시·혈액형·MBTI 정보를 바탕으로 사주 기반의 해석 콘텐츠(프로필·일진·풀이·대화형 조언)를 제공하는 서비스입니다.",
      "모든 해석 콘텐츠는 전통 명리 이론에 기반한 참고용 콘텐츠이며, 사실의 예측이나 보증이 아닙니다.",
    ],
  },
  {
    title: "2. 이용 조건 — 무료와 크레딧",
    body: [
      "오늘의운세 등 일부 콘텐츠는 로그인 없이 무료로 제공됩니다. 로그인 시 무료 범위가 넓어지며, 일부 심층 풀이는 유료 상담 크레딧을 소비하여 이용합니다.",
      "크레딧은 결제 시점에 고지된 수량과 가격대로 지급되며, 유효기간과 잔여 수량은 서비스 내에서 확인할 수 있습니다.",
    ],
  },
  {
    title: "3. 청약철회·환불",
    body: [
      "사용하지 않은 크레딧은 관련 법령이 정한 기간 내에 청약철회(환불)를 요청할 수 있습니다.",
      "크레딧을 소비하여 풀이를 열람한 경우, 해당 열람분은 디지털 콘텐츠의 제공이 완료된 것으로 보아 환불 대상에서 제외됩니다. 이미 열람한 풀이의 재열람에는 크레딧이 추가로 소비되지 않습니다.",
      "결제 오류·중복 결제 등 당사 귀책 사유가 있는 경우 전액 환불합니다. 환불 문의는 문의하기 페이지를 통해 접수할 수 있습니다.",
    ],
  },
  {
    title: "4. 면책",
    body: [
      "서비스의 해석 콘텐츠는 참고용이며, 의료·법률·투자 등 중요한 의사결정의 근거로 사용될 수 없습니다. 이용자의 판단과 선택에 따른 결과에 대해 당사는 책임을 지지 않습니다.",
      "천재지변, 외부 서비스 장애 등 당사가 통제할 수 없는 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
    ],
  },
  {
    title: "5. 계정과 해지",
    body: [
      "이용자는 언제든지 로그아웃하거나 계정 삭제를 요청할 수 있습니다. 계정 삭제 시 프로필과 기록은 개인정보처리방침이 정한 절차에 따라 파기됩니다.",
      "타인의 정보를 무단으로 입력하거나 서비스를 부정한 목적으로 이용하는 경우 이용이 제한될 수 있습니다.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        이용약관
      </h1>
      <p className="mt-2 rounded-card bg-warm-surface p-3 text-xs text-text-soft">
        개발 단계 초안 — 정식 오픈 전 법률 검토 예정
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-base font-medium text-text-main">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-text-soft">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
