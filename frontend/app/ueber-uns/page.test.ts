import {describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({getAbout: vi.fn()}));

vi.mock('@/src/lib/strapi/singleTypes', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/src/lib/strapi/singleTypes')>();
    return {...actual, getAbout: mocks.getAbout};
});

import {generateMetadata} from './page';

describe('About page metadata', () => {
    test('uses the shared excerpt for image-first content', async () => {
        mocks.getAbout.mockResolvedValue({
            name: 'Über uns',
            content: '![Cover](/uploads/cover.jpg)\n\n**Mindestens** 10 Zeichen — wer wir sind.',
        });

        const metadata = await generateMetadata();

        expect(metadata.description).toContain('Mindestens 10 Zeichen');
        expect(metadata.description).not.toContain('!Cover');
    });

    test('falls back to the fixed sentence for empty content', async () => {
        mocks.getAbout.mockResolvedValue({name: 'Über uns', content: ''});

        const metadata = await generateMetadata();

        expect(metadata.description).toBe(
            'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.',
        );
    });
});
