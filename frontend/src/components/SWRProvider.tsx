'use client';

import {SWRConfig} from 'swr';
import {swrConfig} from '@/src/lib/swr/config';
import type {ReactNode} from 'react';

type SWRProviderProps = {
    children: ReactNode;
};

/**
 * SWR provider component that wraps the application with global SWR configuration.
 *
 * This provider:
 * - Applies secure fetcher function
 * - Configures global SWR settings (revalidation, deduplication, retry logic)
 * - Handles errors securely without exposing sensitive information
 *
 * @param children - The application content to wrap
 * @returns SWRConfig wrapper component
 */
export function SWRProvider({children}: SWRProviderProps): React.ReactElement {
    return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}

