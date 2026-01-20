type ErrorCardWithRetryProps = {
    message: string;
    onRetry?: () => void;
    className?: string;
};

/**
 * Displays an error message with a retry button.
 *
 * @param message - The error message to display
 * @param onRetry - Optional retry callback (defaults to window.location.reload)
 * @param className - Optional CSS class for the wrapper element
 */
export function ErrorCardWithRetry({message, onRetry, className}: ErrorCardWithRetryProps) {
    const handleRetry = onRetry ?? (() => window.location.reload());

    return (
        <div className={className}>
            <section>
                <p>{message}</p>
                <button
                    type="button"
                    onClick={handleRetry}
                    style={{marginTop: '1rem', padding: '0.5rem 1rem'}}
                    data-umami-event="error-retry"
                >
                    Erneut versuchen
                </button>
            </section>
        </div>
    );
}

