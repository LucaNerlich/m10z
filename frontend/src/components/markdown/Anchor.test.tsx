import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test, vi} from 'vitest';

vi.mock('next/link', () => ({
    default: ({href, children, ...rest}: {href: string; children: React.ReactNode}) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

import {Anchor} from './Anchor';

const props = {children: 'Link'} as const;

describe('Anchor link targets', () => {
    test('opens an external web link in a new tab and counts it as outbound', () => {
        const html = renderToStaticMarkup(<Anchor {...props} href="https://evil.example/x" />);
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).toContain('data-umami-event="outbound');
    });

    test('leaves mailto and tel links in the same tab without an outbound event', () => {
        for (const href of ['mailto:m10z@posteo.de', 'tel:+4912345']) {
            const html = renderToStaticMarkup(<Anchor {...props} href={href} />);
            expect(html).toContain(`href="${href}"`);
            expect(html).not.toContain('target="_blank"');
            expect(html).not.toContain('data-umami-event');
        }
    });
});
