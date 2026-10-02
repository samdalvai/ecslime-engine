import { describe, expect, jest, test } from '@jest/globals';

import AssetStore from '../../../src/asset-store/AssetStore';
import Registry from '../../../src/ecs/Registry';
import LevelManager from '../../../src/level-manager/LevelManager';
import { createComponentCatalog } from '../../../src/serialization/componentCatalog';
import { LevelMap } from '../../../src/types/map';
import { DEFAULT_SPRITE } from '../../../src/utils/constants';

describe('Testing LevelManager', () => {
    test('Should load level textures and sounds in parallel after the default texture', async () => {
        const loadOrder: string[] = [];
        const pendingAssetLoads: Array<() => void> = [];
        const registry = new Registry();
        const assetStore = {
            clear: jest.fn(),
            addTexture: jest.fn((assetId: string) => {
                loadOrder.push(`texture:${assetId}`);

                if (assetId === DEFAULT_SPRITE) {
                    return Promise.resolve();
                }

                return new Promise<void>(resolve => pendingAssetLoads.push(resolve));
            }),
            addSound: jest.fn((assetId: string) => {
                loadOrder.push(`sound:${assetId}`);
                return new Promise<void>(resolve => pendingAssetLoads.push(resolve));
            }),
        } as unknown as AssetStore;
        const levelManager = new LevelManager(registry, assetStore, createComponentCatalog([]));
        const level: LevelMap = {
            textures: [
                { assetId: 'texture-1', filePath: '/texture-1.png' },
                { assetId: 'texture-2', filePath: '/texture-2.png' },
            ],
            sounds: [
                { assetId: 'sound-1', filePath: '/sound-1.wav' },
                { assetId: 'sound-2', filePath: '/sound-2.wav' },
            ],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };

        const levelLoadPromise = levelManager.loadLevelFromLevelMap(level);
        await Promise.resolve();

        expect(loadOrder).toEqual(['texture:texture-1', 'texture:texture-2', 'sound:sound-1', 'sound:sound-2']);
        expect(pendingAssetLoads).toHaveLength(4);

        for (const resolveAssetLoad of pendingAssetLoads) {
            resolveAssetLoad();
        }

        await expect(levelLoadPromise).resolves.toBe(level);
    });
});
