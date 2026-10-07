import { describe, expect, test } from '@jest/globals';

import { LevelMap } from '../../../src/types/map';
import { isValidLevelMap } from '../../../src/utils/validation';

describe('Testing level utils related functions', () => {
    test('Should return true if object is of type LevelMap', () => {
        const levelMap: LevelMap = {
            textures: [],
            sounds: [],
            mapWidth: 0,
            mapHeight: 0,
            entities: [],
        };

        expect(isValidLevelMap(levelMap)).toBe(true);
    });

    test('accepts legacy levels without names and rejects non-string names', () => {
        const level = { textures: [], sounds: [], mapWidth: 640, mapHeight: 640, entities: [] };
        expect(isValidLevelMap(level)).toBe(true);
        expect(isValidLevelMap({ ...level, name: 'Forest' })).toBe(true);
        expect(isValidLevelMap({ ...level, name: 42 })).toBe(false);
    });

    test('Should return false if object is missing some property from LevelMap', () => {
        const levelMap = {
            textures: [],
            sounds: [],
            mapWidth: 0,
            mapHeight: 0,
        };

        expect(isValidLevelMap(levelMap)).toBe(false);
    });

    test('Should return false if object is of a completely different type', () => {
        const object = { x: 0, y: 0 };

        expect(isValidLevelMap(object)).toBe(false);
    });
});
