// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';

import {M12GMonthCard} from './M12GMonthCard';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const MONTH: M12GMonthWithWinner = {
    month: '2026-09',
    title: 'Testmonat',
    games: [
        {name: 'Sieger Spiel', link: 'https://example.test/winner', votes: 12, earlyAccess: true},
        {name: 'Zweites Spiel', link: 'https://example.test/second', votes: 3, earlyAccess: false},
    ],
    winners: [{name: 'Sieger Spiel', link: 'https://example.test/winner', votes: 12, earlyAccess: true}],
    // Both games are title defenders, so each row must show the badge.
    titleDefenders: ['Sieger Spiel', 'Zweites Spiel'],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
});

async function renderCard(month: M12GMonthWithWinner): Promise<void> {
    await act(async () => {
        root.render(<M12GMonthCard month={month} />);
    });
}

// Same name-group content for both rows: the equality assertion below compares the
// two branches' markup, so the games must carry identical flags.
const SYMMETRIC_MONTH: M12GMonthWithWinner = {
    month: '2026-09',
    games: [
        {name: 'Sieger Spiel', link: 'https://example.test/winner', votes: 12, earlyAccess: true},
        {name: 'Zweites Spiel', link: 'https://example.test/second', votes: 3, earlyAccess: true},
    ],
    winners: [{name: 'Sieger Spiel', link: 'https://example.test/winner', votes: 12, earlyAccess: true}],
    titleDefenders: ['Sieger Spiel', 'Zweites Spiel'],
};

describe('M12GMonthCard', () => {
    test('the winner row and a remaining-game row render identical content', async () => {
        await renderCard(SYMMETRIC_MONTH);

        const listItems = container.querySelectorAll('ul > li');
        expect(listItems.length).toBe(2);

        // The winner group holds its rows in a `<div>`, the remaining games are the
        // `<li>`s themselves. Only the wrapper may differ; the content must match.
        const winnerContent = listItems[0]!.querySelector('div');
        expect(winnerContent, 'winner row content not found').not.toBeNull();

        // Same element tree with the same classes; only the game values differ, so
        // compare the shape rather than the rendered text.
        const shape = (element: Element) =>
            Array.from(element.querySelectorAll('*'))
                .map((child) => `${child.tagName.toLowerCase()}.${child.className}`)
                .join(' > ');

        expect(shape(winnerContent!)).toBe(shape(listItems[1]!));
        // Both rows carry the fields the shared renderer owns.
        expect(shape(winnerContent!)).toContain('earlyAccess');
        expect(shape(winnerContent!)).toContain('titleDefender');
        expect(shape(winnerContent!)).toContain('voteCount');
    });

    test('renders the shared row content once per game', async () => {
        await renderCard(MONTH);

        // One name group per game, each with its link, EA badge, title-defender badge
        // and vote count - so the two branches really do cover the same fields.
        expect(container.querySelectorAll('span[class*="nameGroup"]').length).toBe(2);
        expect(container.querySelectorAll('a[href^="https://example.test/"]').length).toBe(2);
        expect(container.textContent).toContain('Titelträger');
    });

    test('shows both games with votes, EA and title-defender badges', async () => {
        await renderCard(MONTH);

        const text = container.textContent ?? '';
        expect(text).toContain('Sieger Spiel');
        expect(text).toContain('Zweites Spiel');
        expect(text).toContain('Sieger');
        expect(text).toContain('Titelträger');
        // Only the first game is Early Access.
        expect(text.match(/EA/g)?.length).toBe(1);
        expect(text).toContain('12');
        expect(text).toContain('3');
    });

    test('renders the empty state when a month has no games', async () => {
        await renderCard({...MONTH, games: [], winners: [], titleDefenders: []});
        expect(container.textContent).toContain('Keine Spiele für diesen Monat');
    });
});
