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
};

export default nextConfig;
