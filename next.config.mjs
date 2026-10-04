import { withSerwist } from "@serwist/turbopack";

const maxBodySize = 1099511627776;

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  agentRules: false,
  output: "standalone",
  compress: true,
  experimental: {
    proxyClientMaxBodySize: maxBodySize,
  },
  serverExternalPackages: [
    "proper-lockfile",
    "webtorrent",
    "sharp",
  ],
  allowedDevOrigins: process.env.DEV_ORIGINS
    ? process.env.DEV_ORIGINS.split(",")
    : [],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
