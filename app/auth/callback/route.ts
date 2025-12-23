import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // ログイン後に飛ばしたい場所（今回は /mypage）
  let next = searchParams.get("next") ?? "/mypage";
  if (!next.startsWith("/")) next = "/mypage";

  if (code) {
    let response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // ここで「ログイン済みの印（cookie）」が保存される
    if (!error) {
      return response;
    }
  }

  // 失敗したらログイン画面へ
  return NextResponse.redirect(`${origin}/login`);
}
