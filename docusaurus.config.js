// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'Mindestens 10 Zeichen',
    tagline: 'M10Z',
    favicon: 'img/M10Z_Transparent.ico',

    // Set the production url of your site here
    url: 'https://m10z.vercel.app/',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'LucaNerlich', // Usually your GitHub org/user name.
    projectName: 'm10z', // Usually your repo name.

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'de',
        locales: ['en', 'de'],
    },

    plugins: [
        'docusaurus-plugin-sass',
        ['@docusaurus/plugin-ideal-image',
            {
                quality: 70,
                max: 1030, // max resized image's size.
                min: 640, // min resized image's size. if original is lower, use that size.
                steps: 2, // the max number of images generated between min and max (inclusive)
                disableInDev: false,
            },
        ]
    ],

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                theme: {
                    customCss: require.resolve('./src/styles/theme.css'),
                },
                docs: false,
                blog: {
                    routeBasePath: '/',
                    showReadingTime: true,
                    blogSidebarTitle: 'Jüngste Beiträge',
                    blogSidebarCount: 10,
                    editUrl: 'https://github.com/LucaNerlich/m10z',
                },
                pages: {
                    path: 'src/pages',
                    routeBasePath: '/content',
                    include: ['**/*.{js,jsx,ts,tsx,md,mdx}'],
                    exclude: [
                        '**/_*.{js,jsx,ts,tsx,md,mdx}',
                        '**/_*/**',
                        '**/*.test.{js,jsx,ts,tsx}',
                        '**/__tests__/**',
                    ],
                    mdxPageComponent: '@theme/MDXPage',
                    remarkPlugins: [],
                    rehypePlugins: [],
                    beforeDefaultRemarkPlugins: [],
                    beforeDefaultRehypePlugins: [],
                },
            }),
        ],
    ],

    themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            // Replace with your project's social card
            image: 'img/M10Z_Hell.jpg',
            docs: {
                sidebar: {
                    hideable: true
                }
            },
            colorMode: {
                defaultMode: 'dark',
                disableSwitch: false,
                respectPrefersColorScheme: true,
            },
            navbar: {
                hideOnScroll: true,
                title: 'Mindestens 10 Zeichen',
                logo: {
                    alt: 'M10Z Logo',
                    src: 'img/M10Z_Transparent.svg',
                },
                items: [
                    {
                        to: 'tags',
                        label: 'Categories'
                    },
                    {
                        to: '/tags/podcast',
                        label: 'Podcasts'
                    },
                    {
                        to: '/tags/article',
                        label: 'Artikel'
                    },
                    {
                        to: '/content/hello',
                        label: 'Ueber uns'
                    }
                ],
            },
            footer: {
                style: 'dark',
                links: [
                    {
                        title: 'Home',
                        items: [
                            {
                                label: 'Home',
                                to: '/',
                            },
                        ],
                    },
                    {
                        title: 'Community',
                        items: [
                            {
                                label: 'Stack Overflow',
                                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
                            },
                            {
                                label: 'Discord',
                                href: 'https://discordapp.com/invite/docusaurus',
                            },
                            {
                                label: 'Twitter',
                                href: 'https://twitter.com/docusaurus',
                            },
                        ],
                    },
                    {
                        title: 'More',
                        items: [
                            {
                                label: 'GitHub',
                                href: 'https://github.com/facebook/docusaurus',
                            },
                        ],
                    },
                ],
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme,
            },
        }),
};

module.exports = config;
