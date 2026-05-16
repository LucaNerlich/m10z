import {describe, expect, test} from 'vitest';

import {M12GParseError, isMonthId, parseMonth} from './parseMonth';

const validFrontmatter = [
    '---',
    'forum: https://forum.example/t/abc/123',
    'title: A Test Month',
    'finalized: true',
    '---',
].join('\n');

function build(body: string, frontmatter = validFrontmatter): string {
    return `${frontmatter}\n${body}`;
}

describe('isMonthId', () => {
    test.each([
        ['2025-01', true],
        ['2025-12', true],
        ['9999-09', true],
        ['2025-00', false],
        ['2025-13', false],
        ['25-12', false],
        ['2025/12', false],
        ['', false],
        ['2025-1', false],
        ['2025-12 ', false],
    ])('%s → %s', (input, expected) => {
        expect(isMonthId(input)).toBe(expected);
    });
});

describe('parseMonth — happy path', () => {
    test('returns a finalized month with games sorted by votes desc', () => {
        const raw = build([
            '* [Alpha](https://a.example) 3',
            '* [Beta](https://b.example) 7',
            '* [Gamma](https://c.example) 1',
        ].join('\n'));
        const result = parseMonth(raw, '2025-12');

        expect(result).not.toBeNull();
        expect(result!.month).toBe('2025-12');
        expect(result!.title).toBe('A Test Month');
        expect(result!.forumThreadUrl).toBe('https://forum.example/t/abc/123');
        expect(result!.titleDefenders).toEqual([]);
        expect(result!.games.map((g) => g.name)).toEqual(['Beta', 'Alpha', 'Gamma']);
        expect(result!.games.map((g) => g.votes)).toEqual([7, 3, 1]);
    });

    test('parses games with no vote count as 0 votes', () => {
        const raw = build('* [NoVotes](https://x.example)');
        const result = parseMonth(raw, '2025-12');
        expect(result!.games).toHaveLength(1);
        expect(result!.games[0].votes).toBe(0);
    });

    test('strips Early Access suffix and sets flag', () => {
        const raw = build([
            '* [Cool Game (Early Access)](https://x.example) 5',
            '* [Regular Game](https://y.example) 3',
        ].join('\n'));
        const result = parseMonth(raw, '2025-12');
        const ea = result!.games.find((g) => g.name === 'Cool Game')!;
        const reg = result!.games.find((g) => g.name === 'Regular Game')!;
        expect(ea.earlyAccess).toBe(true);
        expect(reg.earlyAccess).toBeUndefined();
    });

    test('accepts hyphen list markers', () => {
        const raw = build('- [Dashed](https://x.example) 4');
        const result = parseMonth(raw, '2025-12');
        expect(result!.games.map((g) => g.name)).toEqual(['Dashed']);
    });
});

describe('parseMonth — winners', () => {
    test('single highest vote → one winner', () => {
        const raw = build([
            '* [A](https://a.example) 3',
            '* [B](https://b.example) 5',
        ].join('\n'));
        const result = parseMonth(raw, '2025-12');
        expect(result!.winners.map((w) => w.name)).toEqual(['B']);
    });

    test('tied highest votes → multiple winners', () => {
        const raw = build([
            '* [A](https://a.example) 5',
            '* [B](https://b.example) 5',
            '* [C](https://c.example) 2',
        ].join('\n'));
        const result = parseMonth(raw, '2025-12');
        expect(result!.winners.map((w) => w.name).sort()).toEqual(['A', 'B']);
    });

    test('all-zero votes → no winners', () => {
        const raw = build([
            '* [A](https://a.example)',
            '* [B](https://b.example) 0',
        ].join('\n'));
        const result = parseMonth(raw, '2025-12');
        expect(result!.winners).toEqual([]);
    });

    test('empty games list → no winners', () => {
        const raw = build('');
        const result = parseMonth(raw, '2025-12');
        expect(result!.games).toEqual([]);
        expect(result!.winners).toEqual([]);
    });
});

describe('parseMonth — drafts', () => {
    test('finalized: false returns null', () => {
        const fm = ['---', 'forum: x', 'title: x', 'finalized: false', '---'].join('\n');
        const raw = `${fm}\n* [A](https://a.example) 1`;
        expect(parseMonth(raw, '2025-12')).toBeNull();
    });
});

describe('parseMonth — error cases', () => {
    test('invalid month-id throws', () => {
        expect(() => parseMonth(validFrontmatter, 'not-a-month'))
            .toThrow(M12GParseError);
    });

    test('missing frontmatter delimiter throws', () => {
        expect(() => parseMonth('* [A](https://a.example) 1', '2025-12'))
            .toThrow(/missing frontmatter delimiter/);
    });

    test('unterminated frontmatter throws', () => {
        const raw = '---\nforum: x\ntitle: x\nfinalized: true';
        expect(() => parseMonth(raw, '2025-12')).toThrow(/unterminated frontmatter/);
    });

    test('malformed frontmatter line throws', () => {
        const fm = ['---', 'forum: x', 'this is garbage', 'finalized: true', '---'].join('\n');
        expect(() => parseMonth(fm, '2025-12')).toThrow(/malformed frontmatter line/);
    });

    test('missing finalized field throws', () => {
        const fm = ['---', 'forum: x', 'title: x', '---'].join('\n');
        expect(() => parseMonth(fm, '2025-12')).toThrow(/missing required 'finalized'/);
    });

    test("non-boolean finalized throws", () => {
        const fm = ['---', 'forum: x', 'title: x', 'finalized: maybe', '---'].join('\n');
        expect(() => parseMonth(fm, '2025-12')).toThrow(/finalized must be/);
    });

    test('missing forum on finalized month throws', () => {
        const fm = ['---', 'title: x', 'finalized: true', '---'].join('\n');
        expect(() => parseMonth(`${fm}\n* [A](https://a.example) 1`, '2025-12'))
            .toThrow(/missing required 'forum'/);
    });

    test('missing title on finalized month throws', () => {
        const fm = ['---', 'forum: x', 'finalized: true', '---'].join('\n');
        expect(() => parseMonth(`${fm}\n* [A](https://a.example) 1`, '2025-12'))
            .toThrow(/missing required 'title'/);
    });

    test('malformed list item throws', () => {
        const raw = build('* not a real list item');
        expect(() => parseMonth(raw, '2025-12')).toThrow(/malformed list item/);
    });

    test('error message includes the file name', () => {
        try {
            parseMonth(validFrontmatter, 'not-a-month');
            expect.fail('should have thrown');
        } catch (e) {
            expect((e as Error).message).toContain('not-a-month.md');
        }
    });
});
