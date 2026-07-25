declare module 'web-push' {
    interface PushSubscription {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }

    interface VapidDetails {
        subject: string;
        publicKey: string;
        privateKey: string;
    }

    export function setVapidDetails(
        subject: string,
        publicKey: string,
        privateKey: string,
    ): void;

    export function sendNotification(
        subscription: PushSubscription,
        payload: string,
        options?: Record<string, unknown>,
    ): Promise<void>;

    export function generateVAPIDKeys(): {
        publicKey: string;
        privateKey: string;
    };
}
