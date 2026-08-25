'use client';

import {SWRConfig} from 'swr';
import {swrConfig} from '@/src/lib/swr/config';
import type {ReactNode} from 'react';

type SWRProviderProps = {
    children: ReactNode;
};

/**
 * Global SWR provider: applies the secure fetcher and shared revalidation/retry settings.
 */
export function SWRProvider({children}: SWRProviderProps): React.ReactElement {
    return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}

