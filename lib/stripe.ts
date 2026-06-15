import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  // ルートが実際に課金を行うときだけ必要。ビルド時は警告にとどめる。
  console.warn("⚠️ STRIPE_SECRET_KEY が未設定です。課金APIは動作しません。");
}

export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  // SDKの既定APIバージョンを使用（ダッシュボード側の設定に追従）
  typescript: true,
});
