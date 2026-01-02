import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // webpack 설정 (xlsx 라이브러리 지원)
  // Next.js 16에서는 Turbopack이 기본이지만, webpack 설정이 필요한 경우 명시적으로 webpack을 사용
  webpack: (config, { isServer }) => {
    // xlsx 라이브러리가 클라이언트에서도 작동하도록 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        perf_hooks: false,
      };
    }
    return config;
  },
  // Turbopack 설정 (비어있으면 webpack 사용)
  turbopack: undefined,
};

export default nextConfig;



