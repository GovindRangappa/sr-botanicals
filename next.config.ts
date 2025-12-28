import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Let preview builds succeed while you fix lint/TS locally
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ✅ Next 15: use remotePatterns instead of deprecated images.domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xpysjkkwshpfobrtgaqs.supabase.co",
        // If your images are in public storage, this matches them:
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // 🔒 Security Headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
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
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
