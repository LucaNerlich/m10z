'use client';

import '@fancyapps/ui/dist/fancybox/fancybox.css';
import {useEffect, useRef, type ReactNode} from 'react';
import {Fancybox} from '@fancyapps/ui';

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

    useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;

        // Bind Fancybox eagerly on mount so it can intercept the first tap/click,
        // especially on mobile browsers where navigation can happen quickly.
        const fb = Fancybox as unknown as FancyboxApi;
        fb.bind(el, '[data-fancybox="article-gallery"]');

        return () => {
            fb.unbind(el);
            fb.close();
        };
    }, []);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}


