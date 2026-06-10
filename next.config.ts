import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf bundles its own reconciler + fontkit; keep it external so
  // Turbopack doesn't try to bundle it into the server build.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The PDF route reads vendored TTFs at runtime; make sure file tracing
  // ships them inside the serverless function.
  outputFileTracingIncludes: {
    "/api/proposals/[id]/pdf": ["./lib/pdf/fonts/**"],
  },
};

export default nextConfig;
