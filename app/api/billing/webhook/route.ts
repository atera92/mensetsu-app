import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "../../../../lib/stripe";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
// Stripe 署名検証には生のボディが必要なため、ボディパースを無効化する。
export const runtime = "nodejs";

/**
 * Stripe Webhook 受信口（自動化の心臓部）。
 * 加入・更新・解約・支払い失敗を受け取り、subscriptions テーブルへ反映する。
 * これによりプレミアム権限の付与/剥奪が完全自動で行われる（人手ゼロ）。
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await syncSubscription(admin, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(admin, sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as { subscription?: string }).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(admin, sub);
        }
        break;
      }
      default:
        // 未対応イベントは無視（200を返してリトライを止める）
        break;
    }
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Stripe の subscription オブジェクトを subscriptions テーブルへ反映。
 * active / trialing のときだけ plan='premium'、それ以外は 'free' に落とす。
 */
async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription
) {
  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (await resolveUserIdFromCustomer(admin, sub.customer as string));

  if (!userId) {
    console.warn("⚠️ user_id を解決できませんでした:", sub.id);
    return;
  }

  const isActive = sub.status === "active" || sub.status === "trialing";
  const periodEnd = (sub as { current_period_end?: number }).current_period_end;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      plan: isActive ? "premium" : "free",
      status: sub.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) console.error("subscriptions upsert error:", error.message);
}

async function resolveUserIdFromCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
