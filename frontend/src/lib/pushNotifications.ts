const PUSH_SUBSCRIBED_KEY = 'm10z_push_subscribed';
const PUSH_SECRET_HEADER = 'x-m10z-push-secret';

function getPushSecret(): string | null {
    // In production, this would come from a secure source.
    // For now, the API proxy routes use a server-side secret so the client
    // never needs to know it.
    return null;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        return registration;
    } catch {
        return null;
    }
}

export async function subscribeToPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) return false;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return false;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });

        // Send subscription to backend
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(subscription.toJSON()),
        });

        if (!response.ok) return false;

        try {
            localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
        } catch {
            // Ignore localStorage errors
        }
        return true;
    } catch {
        return false;
    }
}

export async function unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return true;

        // Notify backend
        await fetch('/api/push/unsubscribe', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(subscription.toJSON()),
        }).catch(() => {
            // Ignore network errors during unsubscribe
        });

        await subscription.unsubscribe();

        try {
            localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
        } catch {
            // Ignore localStorage errors
        }
        return true;
    } catch {
        return false;
    }
}

export function getSubscriptionStatus(): boolean {
    try {
        return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true';
    } catch {
        return false;
    }
}

export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Convert a base64-encoded URL-safe string to a Uint8Array.
 * Required for the applicationServerKey parameter in pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
