import { NextResponse } from "next/server";
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
    if (!error) return NextResponse.redirect(`${base}/`);
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
