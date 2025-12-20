'use client'

import {Metadata} from 'next'

export const metadata: Metadata = {
    title: 'Fehler aufgetreten | m10z',
    description: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function Error({
                                  error,
                                  reset,
                              }: {
    error: Error & {digest?: string}
    reset: () => void
}) {
    return (
        <>
            <div>{error.message}</div>
            <div>{error.digest}</div>
            <button onClick={reset}>Neu laden</button>
        </>
    )
}
