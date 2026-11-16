import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer e mongoose devem rodar como pacotes Node nativos no servidor
  serverExternalPackages: ["@react-pdf/renderer", "mongoose"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /(?:node_modules|\.git|DumpStack\.log\.tmp|System Volume Information|pagefile\.sys|swapfile\.sys|hiberfil\.sys)/i,
    };
    return config;
  },
};

export default nextConfig;
