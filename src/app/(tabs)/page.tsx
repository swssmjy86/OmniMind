import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { currentMilestone, isMilestoneToday } from "@/lib/interpret/milestone";
import { PRODUCTS } from "@/lib/persona/products";
import { PERSONA_IMAGES } from "@/lib/persona/images";
import { PERSONA_GLYPHS } from "@/components/home/PersonaCard";
import { FAQ_ITEMS } from "@/app/faq/page";
import AdSlot from "@/components/ads/AdSlot";
import ReviewHighlights from "@/components/reviews/ReviewHighlights";
import { homeReviewHighlights } from "@/lib/reviews/summary";
import type { ProfileRow } from "@/lib/db/types";

export const dynamic = "force-dynamic"; // 세션에 따라 매번 렌더

/**
 * 홈(4탭 IA 스펙 §2) — 6종 풀이 그리드(→ 사주팔자 탭) + 고객리뷰(실제 코멘트 후기
 * 3개 이상 쌓였을 때만 노출 — P9 §5.2 "빈 상태를 꾸미지 않는다") + FAQ 발췌.
 * 마음·고민 진입은 홈에 없다(확정 결정 7 — 잠금 해제 화면에만).
 */
export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/");
  }

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
    profile = data ?? null;
  }

  let companionDays = 0;
  if (profile) {
    const start = new Date(profile.created_at);
    const now = new Date();
    companionDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const badge = currentMilestone(companionDays);
  const justReached = Boolean(isMilestoneToday(companionDays));

  const grid = PRODUCTS.filter((p) => p.id !== "today");
  const homeSummary = await homeReviewHighlights();

  return (
    <main className="fade-rise p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
          옴니마인드
        </h1>
        {companionDays > 0 && (
          <span className="flex items-center gap-1 text-xs text-text-soft">
            함께한 지 {companionDays}일째
            {badge && (
              <span
                className={`rounded-full bg-warm-surface px-2 py-0.5 text-primary-green ${justReached ? "badge-pop" : ""}`}
              >
                {badge.emoji} {badge.label}
              </span>
            )}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-text-soft">오늘 밤도 당신의 이야기를 켜 두었어요.</p>

      {/* 프로필 없으면 개인화 유도 — 그리드보다 먼저(홈 목업: CTA가 첫 카드) */}
      {!profile && (
        <section className="relative isolate mt-6 overflow-hidden rounded-card border border-accent-coral/30 bg-warm-surface p-5">
          {/* 달지기 배경 — 오늘의운세(/today)로 이끄는 카드라 그 문지기가 맞이한다.
              카드 전면에 밤 장면을 깔고(isolate + z -1), 본문·버튼은 좌측 컬럼에 모아
              우측을 비워 둔다 — 불투명 버튼이 얼굴을 가리지 않도록 얼굴을 우측 빈
              구간으로 옮긴 배치(scale 1.3, 좌측 기준이라 왼쪽 가장자리 공백 없음).
              unoptimized — 커밋된 webp라 이미지 최적화 쿼터 불필요(월 고정비 0원 원칙). */}
          <span aria-hidden className="absolute inset-0 z-[-1]">
            <Image
              src={PERSONA_IMAGES.dalzigi.full}
              alt=""
              fill
              unoptimized
              className="object-cover"
              style={{
                objectPosition: "50% 48%",
                transform: "scale(1.3)",
                transformOrigin: "0% 48%",
              }}
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--warm-surface)_92%,transparent)_0%,color-mix(in_srgb,var(--warm-surface)_50%,transparent)_50%,color-mix(in_srgb,var(--warm-surface)_8%,transparent)_100%)]" />
          </span>
          {/* 본문 좌측 컬럼 — 우측 ~38%는 달지기 몫으로 비워 둔다 */}
          <div className="max-w-[62%]">
            <p className="text-text-soft">
              {user ? (
                <>반가워요. 이제 <span className="text-text-main">당신의 조각들</span>을 이어볼까요?</>
              ) : (
                <>나의 사주로 <span className="text-text-main">더 깊은 오늘</span>을 받아볼까요?</>
              )}
            </p>
            {/* ?input=1 — 인트로 영상이 걷힌 뒤 생년월일 팝업을 (이미 저장돼 있어도) 띄운다 */}
            <Link
              href="/today?input=1"
              className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
            >
              나를 알아보기 ✨
            </Link>
            {!user && (
              <Link href="/login" className="mt-3 block text-center text-sm text-text-soft underline">
                이미 함께했던 분이라면 — 다시 이어보기 (로그인)
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 6종 풀이 그리드 — 클릭하면 사주팔자 탭으로(확정 결정: 홈 → 사주팔자 이동) */}
      <section className="mt-8" aria-label="풀이 종류">
        <div className="grid grid-cols-2 gap-3">
          {grid.map((p) => (
            <Link
              key={p.id}
              href="/saju"
              className="press flex items-center justify-between gap-3 rounded-card border border-text-soft/20 bg-warm-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                  {p.title}
                </p>
                <p className="mt-1 text-xs text-text-soft">{p.tagline}</p>
              </div>
              {/* 담당 페르소나 얼굴 — 로드 전·실패 시 뒤의 글리프가 자리를 지킨다.
                  unoptimized — 이미 webp로 줄여 커밋한 파일(월 고정비 0원 원칙). */}
              <span
                aria-hidden
                className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-warm-base text-xl"
              >
                {PERSONA_GLYPHS[p.personaId]}
                <Image
                  src={PERSONA_IMAGES[p.personaId].avatar}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="absolute inset-0 size-11 object-cover"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 고객리뷰 — 실제 코멘트 후기 3개 이상일 때만(P9 §5.2) */}
      <ReviewHighlights
        summary={homeSummary}
        heading="고객리뷰"
        sub="실제로 풀이를 열어본 분들의 이야기예요."
      />

      {/* 자주묻는질문 발췌 3문항 */}
      <section className="mt-8" aria-label="자주 묻는 질문">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          자주 묻는 질문
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ_ITEMS.slice(0, 3).map((item) => (
            <details key={item.q} className="rounded-card border border-text-soft/20 bg-warm-surface p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-main">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-3 block text-center text-sm text-text-soft underline">
          전체 질문 보기
        </Link>
      </section>

      <AdSlot />

      {/* 보관함은 하단 탭에서 유명인 궁합에 자리를 내주었다(2026-07-26) — 진입점을 여기에 둔다. */}
      {user && (
        <Link href="/archive" className="mt-6 block text-center text-sm text-text-soft underline">
          지난 기록 보기 (보관함)
        </Link>
      )}

      {user && (
        <form action={signOut} className="mt-8 text-center">
          <button className="press text-sm text-text-soft underline">
            잠시 떠나기 (로그아웃)
          </button>
        </form>
      )}
    </main>
  );
}
