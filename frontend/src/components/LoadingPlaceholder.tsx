import {type ReactNode} from 'react';

type LoadingPlaceholderProps = {
    isLoading: boolean;
    hasData: boolean;
    message?: string;
    children?: ReactNode;
    className?: string;
};

/**
 * Displays a loading placeholder when data is being fetched and no data is available yet.
 *
 * @param isLoading - Whether data is currently loading
 * @param hasData - Whether data is already available
 * @param message - Optional custom loading message (default: "Lade...")
 * @param children - Optional custom content to render instead of default message
 * @param className - Optional CSS class for the wrapper element
 */
export function LoadingPlaceholder({
                                       isLoading,
                                       hasData,
                                       message,
                                       children,
                                       className,
                                   }: LoadingPlaceholderProps) {
    // Only show loading if we're loading and don't have data yet
    if (!isLoading || hasData) {
        return null;
    }

    return (
        <div className={className} style={{padding: '2rem', textAlign: 'center'}}>
            {children ?? <div>{message ?? 'Lade...'}</div>}
        </div>
    );
}

