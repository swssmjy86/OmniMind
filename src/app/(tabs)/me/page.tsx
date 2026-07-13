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
      {user ? (
        <div className="mt-4">
          <p className="text-text-soft">
            반가워요, {user.user_metadata?.name ?? "당신"}님. 곧 이곳에서
            당신의 조각들을 이어드릴게요.
          </p>
          <form action={signOut} className="mt-6">
            <button className="text-sm text-text-soft underline">
              잠시 떠나기 (로그아웃)
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-text-soft">아직 우리, 인사를 못 나눴네요.</p>
          <Link
            href="/login"
            className="mt-6 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
          >
            시작해볼까요?
          </Link>
        </div>
      )}
    </main>
  );
}
