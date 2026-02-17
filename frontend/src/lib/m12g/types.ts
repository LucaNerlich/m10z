export interface M12GGame {
    name: string;
    link: string;
    votes: number;
}

export interface M12GMonth {
    month: string;
    title?: string;
    forumThreadUrl?: string;
    games: M12GGame[];
}

export interface M12GMonthWithWinner extends M12GMonth {
    winner: M12GGame | null;
    titleDefender: string | null;
}

export interface M12GOverview {
    months: M12GMonthWithWinner[];
}

export interface M12GLeaderboardEntry {
    name: string;
    link: string;
    totalVotes: number;
    monthsNominated: number;
    wins: number;
}

export interface M12GMonthParticipation {
    month: string;
    totalVotes: number;
    gameCount: number;
}

export interface M12GWinnerEntry {
    month: string;
    gameName: string;
    gameLink: string;
    votes: number;
}

export interface M12GStats {
    totalMonths: number;
    totalUniqueGames: number;
    totalVotes: number;
    avgVotesPerMonth: number;
    leaderboard: M12GLeaderboardEntry[];
    winnerTimeline: M12GWinnerEntry[];
    monthlyParticipation: M12GMonthParticipation[];
}
