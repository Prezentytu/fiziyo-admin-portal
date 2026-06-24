import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.azurefd.net", pathname: "/**" },
      { protocol: "https", hostname: "images.fiziyo.com", pathname: "/**" },
      { protocol: "https", hostname: "**.blob.core.windows.net", pathname: "/**" },
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
    ],
  },
  compiler: {
    reactRemoveProperties:
      process.env.NODE_ENV === "production"
        ? { properties: ["^data-testid$"] }
        : false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "https://fiziyo.pl/terms",
        permanent: true,
      },
      {
        source: "/privacy",
        destination: "https://fiziyo.pl/privacy",
        permanent: true,
      },
      {
        source: "/support",
        destination: "https://fiziyo.pl/support",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
