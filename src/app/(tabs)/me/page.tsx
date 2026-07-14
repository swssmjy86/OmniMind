import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        온전한 나
      </h1>
      <div className="mt-4">
        <p className="text-text-soft">
          {user
            ? `반가워요, ${user.user_metadata?.name ?? "당신"}님. 당신의 조각들을 이어볼까요?`
            : "사주·MBTI·혈액형·별자리를 종합해 '온전한 나'를 만나보세요."}
        </p>
        <Link
          href="/onboarding"
          className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
        {user && (
          <form action={signOut} className="mt-4">
            <button className="text-sm text-text-soft underline">
              잠시 떠나기 (로그아웃)
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
