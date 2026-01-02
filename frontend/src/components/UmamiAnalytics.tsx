import React from 'react';
import Script from 'next/script';

export default function UmamiAnalytics(): React.ReactElement {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    if (!websiteId) {
        return <></>;
    }
    return <Script async src="https://umami.m10z.de/script.js" data-website-id={websiteId} />;
}
