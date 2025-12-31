import type {NextConfig} from 'next';
import {getRemotePatterns} from './src/lib/imageHostnames';

const nextConfig: NextConfig = {
    logging: {
        fetches: {
            hmrRefreshes: true,
            fullUrl: true,
        },
        incomingRequests: true,
    },
    compiler: {
        // removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
    images: {
        minimumCacheTTL: 60,
        dangerouslyAllowLocalIP: true,
        remotePatterns: getRemotePatterns(),
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    async redirects() {
        return [
            // Legacy Docusaurus pages -> Next.js routes
            {source: '/content/imprint', destination: '/impressum', permanent: true},
            {source: '/content/privacy', destination: '/datenschutz', permanent: true},
            {source: '/content/hello', destination: '/ueber-uns', permanent: true},

            // Legacy tag-style entry points -> Next dashboards
            {source: '/tags/podcast', destination: '/podcasts', permanent: true},
            {source: '/tags/artikel', destination: '/artikel', permanent: true},

            // Keep feeds stable
            {source: '/audiofeed', destination: '/audiofeed.xml', permanent: true},
            {source: '/articlefeed', destination: '/rss.xml', permanent: true},
        ];
    },
};

export default nextConfig;
