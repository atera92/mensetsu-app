import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const cookieStore = cookies();
  const response = NextResponse.redirect(`${origin}/login`);

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

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (user) {
    await supabase.from("user_devices").delete().eq("user_id", user.id);
  }

  await supabase.auth.signOut();

  return response;
}
