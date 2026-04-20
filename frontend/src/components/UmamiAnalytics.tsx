import React from 'react';
import Script from 'next/script';

export default function UmamiAnalytics(): React.ReactElement {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://umami.m10z.de';
    const sampleRate = process.env.NEXT_PUBLIC_UMAMI_SAMPLE_RATE || '0.25';
    const maskLevel = process.env.NEXT_PUBLIC_UMAMI_MASK_LEVEL || 'moderate';
    const maxDuration = process.env.NEXT_PUBLIC_UMAMI_MAX_DURATION || '300000';

    if (!websiteId) {
        return <></>;
    }

    return (
        <>
            <Script async src={`${umamiUrl}/script.js`} data-website-id={websiteId}/>
            <Script
                async
                src={`${umamiUrl}/recorder.js`}
                data-website-id={websiteId}
                data-sample-rate={sampleRate}
                data-mask-level={maskLevel}
                data-max-duration={maxDuration}
            />
        </>
    );
}
