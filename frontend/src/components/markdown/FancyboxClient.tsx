'use client';

import '@fancyapps/ui/dist/fancybox/fancybox.css';
import {type ReactNode, useEffect} from 'react';

import {isStaleChunkError} from '@/src/lib/errors';
import {reloadForStaleChunk} from '@/src/lib/staleChunkReload';

type FancyboxClientProps = {
    children: ReactNode;
    className?: string;
};


export function FancyboxClient({children, className}: FancyboxClientProps) {
    useEffect(() => {
        let mounted = true;
        let destroy: (() => void) | null = null;

        (async () => {
            let mod: typeof import('@fancyapps/ui');
            try {
                mod = await import('@fancyapps/ui');
            } catch (error) {
                // The lightbox is an enhancement: a failed chunk load must not
                // surface as an unhandled rejection. Stale-chunk failures get a
                // guarded reload so the gallery works again on the fresh build.
                if (isStaleChunkError(error)) reloadForStaleChunk();
                return;
            }
            if (!mounted) return;

            const {Fancybox} = mod;
            Fancybox.bind('[data-fancybox="article-gallery"]', {
                Carousel: {
                    // Captions come from Markdown titles and CMS media captions.
                    // Fancybox assigns a string caption with innerHTML, after the
                    // Markdown sanitizer has already run, so return an element with
                    // textContent instead: author text must never be parsed as HTML.
                    formatCaption: (_carousel, slide) => {
                        const text = typeof slide.caption === 'string' ? slide.caption : '';
                        // An empty element is still truthy to Fancybox and would add
                        // a blank padded .f-caption to every uncaptioned slide.
                        if (!text) return '';
                        const caption = document.createElement('span');
                        caption.textContent = text;
                        return caption;
                    },
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


