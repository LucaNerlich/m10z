import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
    // Required for `'use cache'` directive.
    // Note: route segment config exports like `export const revalidate = ...` are incompatible with this;
    // we use fetch-level caching (`next.revalidate`, cache tags) + explicit invalidation instead.
    cacheComponents: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
    images: {
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            {protocol: 'http', hostname: 'localhost', port: '1337'},
            {protocol: 'https', hostname: 'irgendwasmitkunden.de'},
            {protocol: 'https', hostname: 'picnotes.de'},
            {protocol: 'https', hostname: 'lucanerlich.com'},
            {protocol: 'https', hostname: 'm10z.de'},
            {protocol: 'https', hostname: 'api.m10z.de'},
        ],
    },
    async redirects() {
        return [
            // Legacy Docusaurus pages -> Next.js routes
            {source: '/content/imprint', destination: '/impressum', permanent: true},
            {source: '/content/privacy', destination: '/datenschutz', permanent: true},
            {source: '/content/hello', destination: '/team', permanent: true},

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
