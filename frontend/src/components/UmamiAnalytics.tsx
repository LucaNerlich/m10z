'use client';

import React, {useEffect} from 'react';
import Script from 'next/script';
import {usePathname} from 'next/navigation';

export default function UmamiAnalytics(): React.ReactElement {
    const pathname = usePathname();
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://umami.m10z.de';
    const sampleRate = process.env.NEXT_PUBLIC_UMAMI_SAMPLE_RATE || '0.25';
    const maskLevel = process.env.NEXT_PUBLIC_UMAMI_MASK_LEVEL || 'moderate';
    const maxDuration = process.env.NEXT_PUBLIC_UMAMI_MAX_DURATION || '300000';
    const isPreview = pathname?.startsWith('/preview') ?? false;

    useEffect(() => {
        // next/script never removes an injected script, so a tracker loaded on a
        // normal page survives a client-side navigation into /preview. A hard
        // reload drops it; a fresh preview load has no tracker, so this cannot loop.
        if (isPreview && (window as {umami?: unknown}).umami) {
            window.location.reload();
        }
    }, [isPreview]);

    // Preview URLs carry a bearer token in the query string and render unpublished
    // drafts; the pageview URL and session replay must never record either.
    if (isPreview) {
        return <></>;
    }

    if (!websiteId) {
        return <></>;
    }

    return (
        <>
            <Script
                async
                src={`${umamiUrl}/script.js`}
                data-website-id={websiteId}
                data-do-not-track="true"
                // Never send the query string: a preview token must not reach analytics.
                data-exclude-search="true"
            />
            <Script
                async
                src={`${umamiUrl}/recorder.js`}
                data-website-id={websiteId}
                data-sample-rate={sampleRate}
                data-mask-level={maskLevel}
                data-max-duration={maxDuration}
                data-do-not-track="true"
                data-exclude-search="true"
            />
        </>
    );
}
