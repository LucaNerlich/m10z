import {generateMissingBlurhashes} from '../src/cron/blurhash';
import {generateMissingWordCounts} from '../src/cron/wordcount';

export default ({env}) => ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
        keys: env.array('APP_KEYS'),
    },
    cron: {
        enabled: true,
        tasks: {
            // Generate blurhash for images missing it - runs every hour
            generateMissingBlurhashes: {
                task: generateMissingBlurhashes,
                options: {
                    rule: '0 * * * *', // Run every hour at minute 0
                },
            },
            // Generate wordCount for articles and podcasts missing it - runs every hour
            generateMissingWordCounts: {
                task: generateMissingWordCounts,
                options: {
                    rule: '0 * * * *', // Run every hour at minute 0
                },
            },
        },
    },
});
