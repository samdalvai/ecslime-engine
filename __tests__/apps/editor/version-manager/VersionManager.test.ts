import { describe, expect, test } from '@jest/globals';
import { LevelMap } from 'ecslime-engine';

import VersionManager from '../../../../apps/editor/version-manager/VersionManager';

describe('Testing version manager related functions', () => {
    test('Should add a new level version with no existing versions', () => {
        const versionManager = new VersionManager();

        const level: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };

        versionManager.addLevelVersion('test', level);
        expect(versionManager.getLevelVersions('test')?.length).toBe(1);
        expect(versionManager.getLevelVersions('test')![0]).toEqual(JSON.stringify(level));
        expect(versionManager.getLevelVersionIndex('test')).toBe(0);
        expect(versionManager.getCurrentLevelVersion('test')).toEqual(level);
    });

    test('Should add a new level version with existing versions', () => {
        const versionManager = new VersionManager();

        const level1: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };

        const level2: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 200,
            mapHeight: 200,
            entities: [],
        };

        versionManager.addLevelVersion('test', level1);
        versionManager.addLevelVersion('test', level2);

        expect(versionManager.getLevelVersions('test')?.length).toBe(2);
        expect(versionManager.getLevelVersions('test')![1]).toEqual(JSON.stringify(level2));
        expect(versionManager.getLevelVersionIndex('test')).toBe(1);
        expect(versionManager.getCurrentLevelVersion('test')).toEqual(level2);
    });

    test('Should set level version to a previous one', () => {
        const versionManager = new VersionManager();

        const level1: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };

        const level2: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 200,
            mapHeight: 200,
            entities: [],
        };

        versionManager.addLevelVersion('test', level1);
        versionManager.addLevelVersion('test', level2);
        versionManager.setPreviousLevelVersion('test');

        expect(versionManager.getCurrentLevelVersion('test')).toEqual(level1);
    });

    test('Should set level version to the next one', () => {
        const versionManager = new VersionManager();

        const level1: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };

        const level2: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 200,
            mapHeight: 200,
            entities: [],
        };

        versionManager.addLevelVersion('test', level1);
        versionManager.addLevelVersion('test', level2);
        versionManager.setPreviousLevelVersion('test');
        versionManager.setNextLevelVersion('test');

        expect(versionManager.getCurrentLevelVersion('test')).toEqual(level2);
    });

    test('a new edit after undo replaces the redo path', () => {
        const versions = new VersionManager();
        const initial: LevelMap = {
            id: 'test',
            name: 'Test',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };
        const firstEdit = { ...initial, mapWidth: 200 };
        const secondEdit = { ...initial, mapWidth: 300 };
        versions.addLevelVersion('test', initial);
        versions.addLevelVersion('test', firstEdit);
        versions.setPreviousLevelVersion('test');

        versions.addLevelVersion('test', secondEdit);
        expect(versions.getLevelVersions('test')).toHaveLength(2);
        expect(versions.getCurrentLevelVersion('test')).toEqual(secondEdit);
        expect(versions.isLatestVersion('test')).toBe(true);

        versions.setPreviousLevelVersion('test');
        expect(versions.getCurrentLevelVersion('test')).toEqual(initial);
        versions.setNextLevelVersion('test');
        expect(versions.getCurrentLevelVersion('test')).toEqual(secondEdit);
    });

    test('a no-op save after undo keeps redo available, including a renamed level', () => {
        const versions = new VersionManager();
        const initial: LevelMap = {
            id: 'test',
            name: 'Old name',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };
        const firstEdit = { ...initial, mapWidth: 200 };
        versions.addLevelVersion('test', initial);
        versions.addLevelVersion('test', firstEdit);
        versions.setPreviousLevelVersion('test');

        versions.addLevelVersion('test', { ...initial, name: 'New name' });
        expect(versions.getLevelVersionIndex('test')).toBe(0);
        expect(versions.getLevelVersions('test')).toHaveLength(2);
        expect(versions.isLatestVersion('test')).toBe(false);
        versions.setNextLevelVersion('test');
        expect(versions.getCurrentLevelVersion('test')).toEqual(firstEdit);
    });

    test('Should throw error when setting non existent level version', () => {
        const versionManager = new VersionManager();

        expect(() => versionManager.setPreviousLevelVersion('test')).toThrowError();
        expect(() => versionManager.setNextLevelVersion('test')).toThrowError();
    });
});
