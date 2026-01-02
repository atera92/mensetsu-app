import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // ログイン後に飛ばしたい場所（今回は /mypage）
  let next = searchParams.get("next") ?? "/mypage";
  if (!next.startsWith("/")) next = "/mypage";

  if (code) {
    const cookieStore = cookies();
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // ここで「ログイン済みの印（cookie）」が保存される
    if (!error) {
      const deviceId = cookieStore.get("device_id")?.value;
      if (!deviceId) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=device_id_missing`);
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=user_missing`);
      }

      const { data: existingDevice, error: deviceError } = await supabase
        .from("user_devices")
        .select("device_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (deviceError) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=device_lookup_failed`);
      }

      if (existingDevice && existingDevice.device_id !== deviceId) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=single_device_only`);
      }

      const { error: upsertError } = await supabase.from("user_devices").upsert(
        {
          user_id: user.id,
          device_id: deviceId,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=device_in_use`);
      }

      return response;
    }
  }

  // 失敗したらログイン画面へ
  return NextResponse.redirect(`${origin}/login`);
}
