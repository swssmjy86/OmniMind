"use client";

// 온보딩(혈액형·MBTI)과 우리의 조합(상대 MBTI)이 함께 쓰는 선택형 알약 버튼.
// 네이티브 <select>는 OS별로 브랜드 톤과 어긋나게 렌더링돼(§5.3 큰 라운드·부드러운 결) 쓰지 않는다.
// <button> 대신 <div role="button">을 쓴다 — iOS Safari 실기기에서 w-full·appearance:none을
// 다 걸어도 <button>이 getComputedStyle/getBoundingClientRect에는 안 잡히는 자체 렌더링
// 인셋을 남겨, 같은 줄의 PickerInput/제출 버튼보다 눈에 띄게(수 mm) 좁게 그려지는 문제가
// 있었다(데스크톱 WebKit 시뮬레이션으로는 재현 자체가 안 됨 — CSSOM에 안 보이는 네이티브
// 위젯 렌더링 단계의 문제로 추정). 네이티브 버튼 위젯을 아예 쓰지 않으면 이 문제와 무관해진다.
export default function Choice({
  children, selected, onClick, small, unselectedBg = "bg-warm-surface", className = "",
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
  /** 부모 배경이 이미 warm-surface인 곳(예: 카드 안)에서는 "bg-warm-base"로 대비를 준다. */
  unselectedBg?: string;
  /** flex 행에서 나란히 쓸 때 flex-1처럼 레이아웃 클래스를 얹기 위한 훅. */
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={selected}
      className={`active:scale-[0.97] motion-reduce:active:scale-100 w-full cursor-pointer select-none rounded-card border py-3 text-center font-medium transition ${small ? "text-sm" : "text-lg"} ${
        selected
          ? "border-selected bg-selected text-on-selected"
          : `border-text-soft/30 ${unselectedBg} text-text-main`
      } ${className}`}
    >
      {children}
    </div>
  );
}
