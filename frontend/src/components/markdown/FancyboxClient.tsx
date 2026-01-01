'use client';

import {useEffect, useRef, type ReactNode} from 'react';

type FancyboxClientProps = {
    children: ReactNode;
    className?: string;
};

type FancyboxApi = {
    // Fancybox.bind has multiple overloads; we only use the (container, selector) form.
    // Keep the typing permissive to avoid fighting upstream types.
    bind: (container: Element | null, itemSelector: string, ...rest: unknown[]) => void;
    unbind: (container: Element | null, ...rest: unknown[]) => void;
    close: (...rest: unknown[]) => void;
};

export function FancyboxClient({children, className}: FancyboxClientProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const fancyboxRef = useRef<FancyboxApi | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        let isMounted = true;
        const el = ref.current;

        const cleanupPromise = import('@fancyapps/ui/dist/fancybox/').then(({Fancybox}) => {
            if (!isMounted) return;
            fancyboxRef.current = Fancybox as unknown as FancyboxApi;
            Fancybox.bind(el, '[data-fancybox="article-gallery"]');
        });

        return () => {
            isMounted = false;
            cleanupPromise.finally(() => {
                const fb = fancyboxRef.current;
                if (fb) {
                    fb.unbind(el);
                    fb.close();
                }
                fancyboxRef.current = null;
            });
        };
    }, []);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}


