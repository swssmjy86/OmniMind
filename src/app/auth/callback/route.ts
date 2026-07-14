import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Vercel 등 프록시 뒤에서는 request.url의 origin이 내부 호스트일 수 있어
  // x-forwarded-host를 우선 사용한다
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base =
    isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 로그인 전 자리로 복귀(om_next 쿠키) — 온보딩 저장 이어가기 등
      const jar = await cookies();
      const rawNext = jar.get("om_next")?.value;
      let next = "/";
      if (rawNext) {
        const decoded = decodeURIComponent(rawNext);
        if (decoded.startsWith("/") && !decoded.startsWith("//")) next = decoded;
      }
      const res = NextResponse.redirect(`${base}${next}`);
      res.cookies.delete("om_next");
      return res;
    }
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
