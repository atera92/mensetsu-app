import type { MetadataRoute } from "next";
import { ARTICLES } from "../lib/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/interview`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${base}/articles/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
