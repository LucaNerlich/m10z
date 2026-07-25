import webpush from 'web-push';

type StrapiLike = {
    log: {
        info: (message: string) => void;
        warn: (message: string, error?: unknown) => void;
    };
    db: {
        query(uid: string): {
            findMany(): Promise<{id: number; endpoint: string; keys: {p256dh: string; auth: string}}[]>;
            delete(opts: {where: {endpoint: string}}): Promise<void>;
        };
    };
};

function getVapidConfig(): {subject: string; publicKey: string; privateKey: string} | null {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !publicKey || !privateKey) {
        return null;
    }
    return {subject, publicKey, privateKey};
}

export async function sendPushNotifications(
    contentType: 'article' | 'podcast',
    title: string,
    url: string,
    strapi: StrapiLike | null,
): Promise<void> {
    const vapid = getVapidConfig();
    if (!vapid) {
        strapi?.log.warn('[pushNotifications] VAPID not configured, skipping push dispatch');
        return;
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    let subscriptions: {id: number; endpoint: string; keys: {p256dh: string; auth: string}}[] = [];
    try {
        const result = await strapi?.db?.query('api::push-subscription.push-subscription').findMany();
        if (!result || result.length === 0) {
            strapi?.log.info('[pushNotifications] No subscriptions to notify');
            return;
        }
        subscriptions = Array.isArray(result) ? result : [];
    } catch (error) {
        strapi?.log.warn('[pushNotifications] Failed to fetch subscriptions', error);
        return;
    }

    const payload = JSON.stringify({
        title: `Neuer ${contentType === 'article' ? 'Artikel' : 'Podcast'}: ${title}`,
        body: `Schau dir den neuen ${contentType === 'article' ? 'Artikel' : 'Podcast'} auf m10z.de an!`,
        url,
        icon: '/icon-192.png',
    });

    let successCount = 0;
    let failureCount = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                },
                payload,
            );
            successCount++;
        } catch (error: any) {
            failureCount++;
            if (error?.statusCode === 410 || error?.statusCode === 404) {
                staleEndpoints.push(sub.endpoint);
            }
        }
    }

    if (staleEndpoints.length > 0) {
        try {
            for (const endpoint of staleEndpoints) {
                await strapi?.db?.query('api::push-subscription.push-subscription').delete({
                    where: {endpoint},
                });
            }
            strapi?.log.info(`[pushNotifications] Removed ${staleEndpoints.length} stale subscription(s)`);
        } catch (error) {
            strapi?.log.warn('[pushNotifications] Failed to remove stale subscriptions', error);
        }
    }

    strapi?.log.info(
        `[pushNotifications] Sent ${successCount} notification(s) for "${title}" (${failureCount} failure(s))`,
    );
}
