import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required so neo4j-driver (and other Node-only libs) don't get bundled for the browser
  serverExternalPackages: ['neo4j-driver', '@slack/socket-mode', '@slack/web-api', 'ws'],
};

export default nextConfig;
