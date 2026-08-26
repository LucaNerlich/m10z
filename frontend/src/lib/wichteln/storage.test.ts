import {describe, expect, test} from 'vitest';

import {parseWichtelnStorage} from './storage';

const validPayload = {
    participants: [
        {id: 'a', name: 'Anna', profileUrl: 'https://steamcommunity.com/id/anna'},
        {id: 'b', name: 'Ben', profileUrl: ''},
    ],
    assignments: [
        {giverId: 'a', receiverId: 'b'},
        {giverId: 'b', receiverId: 'a'},
    ],
};

describe('parseWichtelnStorage', () => {
    test('accepts and normalizes a fully consistent payload', () => {
        const parsed = parseWichtelnStorage(validPayload);
        expect(parsed).not.toBeNull();
        expect(parsed?.participants).toHaveLength(2);
        expect(parsed?.assignments).toHaveLength(2);
    });

    test('accepts empty assignments', () => {
        const parsed = parseWichtelnStorage({...validPayload, assignments: []});
        expect(parsed).not.toBeNull();
        expect(parsed?.assignments).toEqual([]);
    });

    test('migrates legacy participants without ids and with steamProfileUrl', () => {
        const parsed = parseWichtelnStorage({
            participants: [{name: 'Anna', steamProfileUrl: 'https://steamcommunity.com/id/anna'}],
            assignments: [],
        });
        expect(parsed).not.toBeNull();
        expect(parsed?.participants).toEqual([
            {
                id: expect.any(String),
                name: 'Anna',
                profileUrl: 'https://steamcommunity.com/id/anna',
            },
        ]);
    });

    test('rejects non-object payloads', () => {
        expect(parseWichtelnStorage(null)).toBeNull();
        expect(parseWichtelnStorage('nope')).toBeNull();
        expect(parseWichtelnStorage(42)).toBeNull();
    });

    test('rejects payloads with missing participant or assignment arrays', () => {
        expect(parseWichtelnStorage({participants: [], assignments: 'nope'})).toBeNull();
        expect(parseWichtelnStorage({assignments: []})).toBeNull();
    });

    test('rejects null or malformed participants', () => {
        expect(
            parseWichtelnStorage({
                participants: [null, {id: 'b', name: 'Ben', profileUrl: ''}],
                assignments: [],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: ['anna', {id: 'b', name: 'Ben', profileUrl: ''}],
                assignments: [],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: [{id: 'a'}, {id: 'b', name: 'Ben', profileUrl: ''}],
                assignments: [],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: [{id: 'a', name: '   ', profileUrl: ''}],
                assignments: [],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: [{id: 7, name: 'Anna', profileUrl: ''}],
                assignments: [],
            }),
        ).toBeNull();
    });

    test('rejects duplicate participant ids', () => {
        expect(
            parseWichtelnStorage({
                participants: [
                    {id: 'a', name: 'Anna', profileUrl: ''},
                    {id: 'a', name: 'Ben', profileUrl: ''},
                ],
                assignments: [],
            }),
        ).toBeNull();
    });

    test('rejects malformed assignments', () => {
        expect(
            parseWichtelnStorage({
                participants: validPayload.participants,
                assignments: [null],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: validPayload.participants,
                assignments: [{giverId: 'a'}],
            }),
        ).toBeNull();
    });

    test('rejects assignments referencing unknown participant ids', () => {
        expect(
            parseWichtelnStorage({
                participants: validPayload.participants,
                assignments: [{giverId: 'a', receiverId: 'ghost'}],
            }),
        ).toBeNull();
        expect(
            parseWichtelnStorage({
                participants: validPayload.participants,
                assignments: [{giverId: 'ghost', receiverId: 'a'}],
            }),
        ).toBeNull();
    });
});
