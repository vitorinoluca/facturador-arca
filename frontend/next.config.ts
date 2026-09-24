import type { NextConfig } from "next";

// BACKEND_URL (solo server, sin NEXT_PUBLIC) = URL real del proyecto backend en Vercel.
// Con él, /api/* se proxea al backend y todo vive bajo un único dominio (cookies
// first-party). En local no se define y el front le pega directo a localhost:3001.
const backendUrl = process.env.BACKEND_URL;

const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    return backendUrl ? [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }] : [];
  },
};

export default nextConfig;
