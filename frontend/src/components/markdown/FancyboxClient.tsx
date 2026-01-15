'use client';

import '@fancyapps/ui/dist/fancybox/fancybox.css';
import {type ReactNode, useEffect} from 'react';

type FancyboxClientProps = {
    children: ReactNode;
    className?: string;
};


export function FancyboxClient({children, className}: FancyboxClientProps) {
    useEffect(() => {
        let mounted = true;
        let destroy: (() => void) | null = null;

        (async () => {
            const mod = await import('@fancyapps/ui');
            if (!mounted) return;

            const {Fancybox} = mod;
            Fancybox.bind('[data-fancybox="article-gallery"]', {
                Carousel: {
                    Toolbar: {
                        display: {
                            left: ['counter'],
                            middle: ['zoomIn', 'zoomOut', 'toggle1to1'],
                            right: ['download', 'autoplay', 'thumbs', 'close'],
                        },
                    },
                },
            });

            destroy = () => {
                Fancybox.destroy();
            };
        })();

        return () => {
            mounted = false;
            destroy?.();
        };
    }, []);

    return (
        <div className={className}>
            {children}
        </div>
    );
}


