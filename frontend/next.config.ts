import type {NextConfig} from 'next';
import {getRemotePatterns} from './src/lib/imageHostnames';

const nextConfig: NextConfig = {
    // Required for `'use cache'` directive.
    // Note: route segment config exports like `export const revalidate = ...` are incompatible with this;
    // we use fetch-level caching (`next.revalidate`, cache tags) + explicit invalidation instead.
    cacheComponents: true,
    compiler: {
        // removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
    images: {
        dangerouslyAllowLocalIP: true,
        remotePatterns: getRemotePatterns(),
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
