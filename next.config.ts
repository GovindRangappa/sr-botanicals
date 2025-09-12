import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["xpysjkkwshpfobrtgaqs.supabase.co"], // 👈 Your Supabase Storage domain
  },
};

export default nextConfig;
