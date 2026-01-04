import type {NextConfig} from 'next';
import {ALLOWED_IMAGE_HOSTNAMES, getRemotePatterns} from './src/lib/imageHostnames';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
    ...(isProd
        ? {}
        : {
              logging: {
                  fetches: {
                      hmrRefreshes: true,
                      fullUrl: true,
                  },
                  incomingRequests: true,
              },
          }),
    compiler: {
        // removeConsole: process.env.NODE_ENV === 'production',
    },
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
    images: {
        minimumCacheTTL: process.env.NODE_ENV === 'production' ? 3600 : 60,
        dangerouslyAllowLocalIP: true,
        remotePatterns: getRemotePatterns(),
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        qualities: [50, 60, 75, 80, 90, 95]
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
    async headers() {
        // Keep development experience (HMR, overlays) unblocked by restrictions.
        if (!isProd) return [];

        const unique = (values: string[]) => Array.from(new Set(values));

        const strapiOriginForCsp = (() => {
            const raw = process.env.NEXT_PUBLIC_STRAPI_URL;
            if (!raw) return null;
            try {
                const url = new URL(raw);
                // Only include the origin (scheme + host + optional port) in CSP.
                return url.origin;
            } catch {
                return null;
            }
        })();

        // Mirror Next/Image remote hostnames in CSP. In production, we only allow HTTPS sources here.
        const remoteImageSources = unique(
            ALLOWED_IMAGE_HOSTNAMES.filter((hostname) => hostname !== 'localhost').map((hostname) => `https://${hostname}`),
        );

        const cspDirectives = [
            "default-src 'self'",
            // Allow inline scripts to support Next.js bootstrapping and inline JSON-LD.
            "script-src 'self' 'unsafe-inline' https://umami.m10z.de https://www.youtube.com https://s.ytimg.com",
            "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
            `img-src ${unique([
                "'self'",
                // Used by Next.js blur placeholders and some inline SVG patterns.
                'data:',
                'blob:',
                // Allow images from configured Strapi origin (e.g. http://localhost:1337 in local prod-like setups).
                ...(strapiOriginForCsp ? [strapiOriginForCsp] : []),
                ...remoteImageSources,
                // YouTube thumbnails.
                'https://i.ytimg.com',
                'https://ytimg.com',
            ]).join(' ')}`,
            "connect-src 'self' https://umami.m10z.de https://*.googlevideo.com",
            `media-src ${unique([
                "'self'",
                // Allow media from configured Strapi origin (e.g. http://localhost:1337 in local prod-like setups).
                ...(strapiOriginForCsp ? [strapiOriginForCsp] : []),
                'https://*.googlevideo.com',
            ]).join(' ')}`,
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        const csp = cspDirectives.join('; ');

        // Deny sensitive APIs by default; keep policies conservative to avoid breaking embeds.
        const permissionsPolicy = [
            'accelerometer=()',
            'ambient-light-sensor=()',
            'autoplay=()',
            'battery=()',
            'camera=()',
            'clipboard-read=()',
            'clipboard-write=()',
            'display-capture=()',
            'geolocation=()',
            'gyroscope=()',
            'hid=()',
            'interest-cohort=()',
            'magnetometer=()',
            'microphone=()',
            'midi=()',
            'payment=()',
            'publickey-credentials-get=()',
            'screen-wake-lock=()',
            'serial=()',
            'usb=()',
            'web-share=()',
        ].join(', ');

        return [
            {
                source: '/:path*',
                headers: [
                    {key: 'Content-Security-Policy', value: csp},
                    {key: 'X-Frame-Options', value: 'DENY'},
                    {key: 'X-Content-Type-Options', value: 'nosniff'},
                    {key: 'Referrer-Policy', value: 'origin-when-cross-origin'},
                    {key: 'Permissions-Policy', value: permissionsPolicy},
                ],
            },
        ];
    },
};

export default nextConfig;
