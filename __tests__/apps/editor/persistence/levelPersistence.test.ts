import { AssetStore, Component, Registry } from 'ecslime-engine';

import { saveCurrentLevelToLocalStorage } from '../../../../apps/editor/persistence/levelPersistence';

class MarkerComponent extends Component {
    value = 7;
}

describe('Editor level persistence', () => {
    test('commits pending components before writing a level', () => {
        const stored = new Map<string, string>();
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => stored.get(key) ?? null,
                setItem: (key: string, value: string) => stored.set(key, value),
            },
        });
        stored.set('level-0', JSON.stringify({ name: 'Forest', textures: [], sounds: [], mapWidth: 640, mapHeight: 640, entities: [] }));
        const registry = new Registry();
        const assetStore = {
            getTexturesFilePaths: () => [],
            getSoundsFilePaths: () => [],
        } as unknown as AssetStore;
        const entity = registry.createEntity();
        entity.group('obstacles');
        entity.addComponent(MarkerComponent);

        saveCurrentLevelToLocalStorage('level-0', registry, assetStore);

        const written = JSON.parse(stored.get('level-0') as string);
        expect(written.name).toBe('Forest');
        expect(written.entities[0].components).toEqual([{ name: 'MarkerComponent', properties: { value: 7 } }]);
    });
});
