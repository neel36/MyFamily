declare module "next-pwa" {
  import { NextConfig } from "next";

  function withPWA(config: NextConfig): (nextConfig: NextConfig) => NextConfig;
  function withPWA(
    pwaConfig: {
      dest?: string;
      disable?: boolean;
      register?: boolean;
      scope?: string;
      sw?: string;
      skipWaiting?: boolean;
      [key: string]: unknown;
    }
  ): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
