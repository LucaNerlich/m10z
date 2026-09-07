import type {StrapiApp} from '@strapi/strapi/admin';

import {UmamiChartIcon} from './components/UmamiChartIcon';
import {PLUGIN_ID} from './pluginId';

export default {
    register(app: StrapiApp) {
        app.registerPlugin({
            id: PLUGIN_ID,
            name: PLUGIN_ID,
        });

        app.widgets.register({
            icon: UmamiChartIcon,
            title: {
                id: `${PLUGIN_ID}.widget.title`,
                defaultMessage: 'Umami-Statistiken',
            },
            component: async () => {
                const module = await import('./components/UmamiStatsWidget');
                return module.UmamiStatsWidget;
            },
            id: 'umami-stats',
            pluginId: PLUGIN_ID,
        });
    },

    bootstrap() {},
};
