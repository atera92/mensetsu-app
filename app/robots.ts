import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 個人データ・操作系は検索インデックスから除外
      disallow: ["/mypage", "/login", "/logout", "/auth/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
