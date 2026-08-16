import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy BetterAuth routes
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      // Proxy data API routes (recipes, shopping-list, etc.)
      {
        source: "/backend/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
