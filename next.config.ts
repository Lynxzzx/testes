import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer, pdfkit e mongoose devem rodar como pacotes Node nativos no servidor
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit", "mongoose"],
  // Garante que a Vercel inclua as fontes padrão e dados do pdfkit no bundle serverless
  outputFileTracingIncludes: {
    "/api/proposals/[id]/pdf": [
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
    ],
    "/*": [
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
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
