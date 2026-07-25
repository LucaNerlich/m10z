export default {
    routes: [
        {
            method: 'POST',
            path: '/push-subscriptions',
            handler: 'push-subscription.subscribe',
            config: {
                auth: false,
                policies: [],
            },
        },
        {
            method: 'DELETE',
            path: '/push-subscriptions',
            handler: 'push-subscription.unsubscribe',
            config: {
                auth: false,
                policies: [],
            },
        },
    ],
};
