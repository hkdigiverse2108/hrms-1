/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: false,
    workerThreads: false,
    cpus: 1,
  },
  images: { 
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const localBackendPort = process.env.BACKEND_PORT || '8000';
    return {
      beforeFiles: [
        {
          source: '/api/activity/session-active/:path*',
          destination: `http://127.0.0.1:${localBackendPort}/activity/session-active/:path*`,
        },
        {
          source: '/api/activity/session-inactive',
          destination: `http://127.0.0.1:${localBackendPort}/activity/session-inactive`,
        },
        {
          source: '/api/activity/last-active',
          destination: `http://127.0.0.1:${localBackendPort}/activity/last-active`,
        },
        {
          source: '/api/system/info',
          destination: `http://127.0.0.1:${localBackendPort}/system/info`,
        },
        {
          source: '/api/:path*',
          destination: `${backendUrl}/:path*`,
        },
      ],
    }
  },
}

export default nextConfig

