'use client';

import {useEffect, useRef} from 'react';

type FancyboxClientProps = {
    children: React.ReactNode;
    className?: string;
};

export function FancyboxClient({children, className}: FancyboxClientProps) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        let isMounted = true;
        const el = ref.current;

        const cleanupPromise = import('@fancyapps/ui/dist/fancybox/').then(({Fancybox}) => {
            if (!isMounted) return;
            Fancybox.bind(el, '[data-fancybox="article-gallery"]');
        });

        return () => {
            isMounted = false;
            cleanupPromise.then(() => {
                import('@fancyapps/ui/dist/fancybox/').then(({Fancybox}) => {
                    Fancybox.unbind(el);
                    Fancybox.close();
                });
            });
        };
    }, []);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}


