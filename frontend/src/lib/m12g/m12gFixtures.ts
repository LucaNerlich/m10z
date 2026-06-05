import {computeWinners} from './parseMonth';
import {type M12GGame, type M12GMonthWithWinner} from './types';

// Test-only fixtures for the M12G domain. Shared across the m12g unit tests so the
// Winner rule lives in one place (parseMonth.computeWinners) instead of being
// re-implemented in every test file, where it could drift from production.

// A nominated Game with the given vote tally.
export function game(name: string, votes: number, link = `https://${name.toLowerCase()}.example`): M12GGame {
    return {name, link, votes};
}

// A finalized Month. Winners default to the production rule applied to `games`
// (highest non-zero vote count); pass `winners` only to exercise an explicit set.
export function month(
    id: string,
    games: M12GGame[],
    winners: M12GGame[] = computeWinners([...games].sort((a, b) => b.votes - a.votes)),
): M12GMonthWithWinner {
    return {
        month: id,
        title: `M ${id}`,
        forumThreadUrl: 'https://forum.example',
        games,
        winners,
        titleDefenders: [],
    };
}
