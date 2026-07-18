import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = { title: "문의하기 — 옴니마인드" };

export default async function ContactPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        문의하기
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        궁금한 점, 불편했던 점, 어떤 이야기든 편하게 남겨 주세요. 이메일로 답장을 드려요.
      </p>
      <div className="mt-5">
        <ContactForm defaultEmail={user?.email ?? ""} />
      </div>
      <p className="mt-6 text-center text-xs text-text-soft">
        이메일이 편하다면{" "}
        <a href="mailto:swssmjy86@gmail.com" className="underline underline-offset-2">
          swssmjy86@gmail.com
        </a>
        으로 보내 주셔도 좋아요.
      </p>
    </main>
  );
}
