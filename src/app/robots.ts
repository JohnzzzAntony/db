import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Only the landing page is public; everything else is behind sign-in.
  return { rules: [{ userAgent: "*", allow: "/$", disallow: "/" }] };
}
