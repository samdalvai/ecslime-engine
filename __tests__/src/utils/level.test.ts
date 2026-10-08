import { describe, expect, test } from '@jest/globals';

import { LevelMap } from '../../../src/types/map';
import { isValidLevelMap } from '../../../src/utils/validation';

const level: LevelMap = {
    id: 'forest',
    name: 'Forest',
    textures: [],
    sounds: [],
    mapWidth: 640,
    mapHeight: 640,
    entities: [],
};

describe('Level map validation', () => {
    test('accepts a level with an ID and name', () => {
        expect(isValidLevelMap(level)).toBe(true);
    });

    test('rejects missing, blank, and non-string identities', () => {
        expect(isValidLevelMap({ ...level, id: undefined })).toBe(false);
        expect(isValidLevelMap({ ...level, name: undefined })).toBe(false);
        expect(isValidLevelMap({ ...level, id: '  ' })).toBe(false);
        expect(isValidLevelMap({ ...level, name: '  ' })).toBe(false);
        expect(isValidLevelMap({ ...level, id: 42 })).toBe(false);
        expect(isValidLevelMap({ ...level, name: 42 })).toBe(false);
    });

    test('rejects missing level data and unrelated objects', () => {
        expect(isValidLevelMap({ id: 'forest', name: 'Forest' })).toBe(false);
        expect(isValidLevelMap({ x: 0, y: 0 })).toBe(false);
    });
});
