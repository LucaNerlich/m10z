'use client';

type ErrorProps = {
    error: Error & {digest?: string};
    reset: () => void;
};

export default function PodcastPreviewError({reset}: ErrorProps) {
    return (
        <section>
            <h1>Service unavailable</h1>
            <p>Preview content is temporarily unavailable. Please try again shortly.</p>
            <button type="button" onClick={() => reset()}>
                Retry
            </button>
        </section>
    );
}
