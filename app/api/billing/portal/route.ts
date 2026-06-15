import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { stripe } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe カスタマーポータルへのリンクを返す。
 * 解約・支払い方法変更・領収書取得をユーザー自身で完結させ、運用工数をゼロに保つ。
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "現在ご利用中のサブスクリプションが見つかりません。" },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl}/mypage`,
  });

  return NextResponse.json({ url: portal.url });
}
