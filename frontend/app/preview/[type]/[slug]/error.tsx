'use client';

type ErrorProps = {
    error: Error & {digest?: string};
    reset: () => void;
};

export default function PreviewError({error, reset}: ErrorProps) {
    const digest = error.digest ?? '';
    const throttled = digest.startsWith('PREVIEW_RATE_LIMITED');
    const retryAfter = throttled ? Number(digest.split(':')[1]) || 60 : 0;

    return (
        <section>
            <h1>{throttled ? 'Zu viele Anfragen' : 'Service unavailable'}</h1>
            <p>
                {throttled
                    ? `Bitte in ${retryAfter} Sekunden erneut versuchen.`
                    : 'Preview content is temporarily unavailable. Please try again shortly.'}
            </p>
            <button type="button" onClick={() => reset()}>
                Retry
            </button>
        </section>
    );
}
