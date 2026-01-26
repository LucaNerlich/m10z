export default {
    type: 'content-api',
    routes: [
        {
            method: 'GET',
            path: '/search-index/metrics',
            handler: 'search-index.metrics',
            config: {
                auth: false,
            },
        },
    ],
};
