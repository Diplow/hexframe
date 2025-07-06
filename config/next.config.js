/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "../src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  env: {
    E2E_TEST: process.env.E2E_TEST || '',
  },
   devIndicators: {
    position: 'bottom-right'
  },
  // Skip linting and type checking during production builds
  // These checks are run in CI/CD pipeline separately
  // This prevents build failures due to strict linting rules
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Handle www to non-www redirect at the application level
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.hexframe.ai',
          },
        ],
        destination: 'https://hexframe.ai/:path*',
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve these Node.js modules on the client
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        perf_hooks: false,
      };
    }
    return config;
  },
};

export default config;