export interface M12GGame {
    name: string;
    link: string;
    votes: number;
}

export interface M12GMonth {
    month: string;
    forumThreadUrl?: string;
    games: M12GGame[];
}

export interface M12GMonthWithWinner extends M12GMonth {
    winner: M12GGame | null;
}

export interface M12GOverview {
    months: M12GMonthWithWinner[];
}
