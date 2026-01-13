'use client';

import '@fancyapps/ui/dist/fancybox/fancybox.css';
import {type ReactNode, useEffect} from 'react';
import {Fancybox} from '@fancyapps/ui';

type FancyboxClientProps = {
    children: ReactNode;
    className?: string;
};


export function FancyboxClient({children, className}: FancyboxClientProps) {
    useEffect(() => {
        Fancybox.bind('[data-fancybox="article-gallery"]', {
            Carousel: {
                Toolbar: {
                    display: {
                        left: ['counter'],
                        middle: [
                            'zoomIn',
                            'zoomOut',
                            'toggle1to1',
                        ],
                        right: ['download', 'autoplay', 'thumbs', 'close'],
                    },
                },
            },
        });

        return () => {
            Fancybox.destroy();
        };
    }, []);

    return (
        <div className={className}>
            {children}
        </div>
    );
}


