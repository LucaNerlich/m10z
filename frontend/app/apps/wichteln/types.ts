export type Participant = {
    id: string;
    name: string;
    profileUrl: string;
};

export type Assignment = {
    giverId: string;
    receiverId: string;
};

export type WichtelnState = {
    participants: Participant[];
    assignments: Assignment[];
    timestamp: number;
};
