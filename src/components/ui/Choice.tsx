"use client";

// 온보딩(혈액형·MBTI)과 우리의 조합(상대 MBTI)이 함께 쓰는 선택형 알약 버튼.
// 네이티브 <select>는 OS별로 브랜드 톤과 어긋나게 렌더링돼(§5.3 큰 라운드·부드러운 결) 쓰지 않는다.
export default function Choice({
  children, selected, onClick, small, unselectedBg = "bg-warm-surface",
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
  /** 부모 배경이 이미 warm-surface인 곳(예: 카드 안)에서는 "bg-warm-base"로 대비를 준다. */
  unselectedBg?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`active:scale-[0.97] motion-reduce:active:scale-100 w-full rounded-card border py-3 font-medium transition ${small ? "text-sm" : "text-lg"} ${
        selected
          ? "border-selected bg-selected text-on-selected"
          : `border-text-soft/30 ${unselectedBg} text-text-main`
      }`}
    >
      {children}
    </button>
  );
}
