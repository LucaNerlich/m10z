'use client';

import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {Bell, BellSlash} from '@phosphor-icons/react/dist/ssr';

import {isPushSupported, getSubscriptionStatus, subscribeToPush, unsubscribeFromPush} from '@/src/lib/pushNotifications';

import styles from './NotificationToggle.module.css';

const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

export function NotificationToggle() {
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
    const [subscribed, setSubscribed] = useState(false);
    const [supported, setSupported] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSupported(isPushSupported());
        setSubscribed(getSubscriptionStatus());
    }, []);

    const toggle = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        try {
            if (subscribed) {
                const ok = await unsubscribeFromPush();
                if (ok) setSubscribed(false);
            } else {
                const ok = await subscribeToPush();
                if (ok) setSubscribed(true);
            }
        } finally {
            setLoading(false);
        }
    }, [subscribed, loading]);

    if (!hydrated || !supported) return null;

    return (
        <button
            type="button"
            className={`${styles.button} ${subscribed ? styles.active : ''}`}
            onClick={toggle}
            disabled={loading}
            aria-label={subscribed ? 'Push-Benachrichtigungen deaktivieren' : 'Push-Benachrichtigungen aktivieren'}
            data-umami-event={subscribed ? 'push-unsubscribe' : 'push-subscribe'}
        >
            {subscribed ? <Bell size={18} weight="fill" /> : <BellSlash size={18} />}
        </button>
    );
}
