import { describe, expect, test } from '@jest/globals';

import {
    deleteLevelFromLocalStorage,
    getAllLevelIdsFromLocalStorage,
    levelStorageKey,
} from '../../../../apps/editor/persistence/persistence';

describe('Editor level storage keys', () => {
    test('lists and deletes levels by their IDs without including editor settings', () => {
        const data = new Map([
            ['editor-settings', '{}'],
            [levelStorageKey('first'), '{}'],
            [levelStorageKey('second'), '{}'],
        ]);
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                get length() {
                    return data.size;
                },
                key: (index: number) => [...data.keys()][index] ?? null,
                removeItem: (key: string) => data.delete(key),
            },
        });

        expect(getAllLevelIdsFromLocalStorage()).toEqual(['first', 'second']);
        deleteLevelFromLocalStorage('first');
        expect(getAllLevelIdsFromLocalStorage()).toEqual(['second']);
        expect(data.has('editor-settings')).toBe(true);
    });
});
