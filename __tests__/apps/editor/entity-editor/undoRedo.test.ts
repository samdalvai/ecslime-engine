import { afterEach, describe, expect, test } from '@jest/globals';
import { AssetStore, Engine, EventBus, LevelManager, LevelMap, Registry } from 'ecslime-engine';

import Editor from '../../../../apps/editor/Editor';
import EntityEditor from '../../../../apps/editor/entity-editor/EntityEditor';
import { levelStorageKey } from '../../../../apps/editor/persistence/persistence';
import VersionManager from '../../../../apps/editor/version-manager/VersionManager';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalWidth = Engine.mapWidth;
const originalHeight = Engine.mapHeight;

afterEach(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    Editor.editorSettings.selectedLevel = null;
    Engine.mapWidth = originalWidth;
    Engine.mapHeight = originalHeight;
});

describe('editor undo and redo', () => {
    test('undo after a new debounced edit returns to the state before that edit', async () => {
        const initial: LevelMap = {
            id: 'level-id',
            name: 'Forest',
            textures: [],
            sounds: [],
            mapWidth: 100,
            mapHeight: 100,
            entities: [],
        };
        const stored = new Map([[levelStorageKey(initial.id), JSON.stringify(initial)]]);
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => stored.get(key) ?? null,
                setItem: (key: string, value: string) => stored.set(key, value),
            },
        });
        Object.defineProperty(globalThis, 'document', {
            configurable: true,
            value: { getElementById: () => null },
        });
        Editor.editorSettings.selectedLevel = initial.id;
        Engine.mapWidth = initial.mapWidth;
        Engine.mapHeight = initial.mapHeight;

        const versions = new VersionManager();
        versions.addLevelVersion(initial.id, initial);
        const registry = new Registry();
        const assetStore = {
            getTexturesFilePaths: () => [],
            getSoundsFilePaths: () => [],
        } as unknown as AssetStore;
        const levelManager = {
            loadLevelFromLevelMap: async (level: LevelMap) => {
                Engine.mapWidth = level.mapWidth;
                Engine.mapHeight = level.mapHeight;
                return level;
            },
        } as unknown as LevelManager;
        const eventBus = { emitEvent: () => undefined } as unknown as EventBus;
        const editor = new EntityEditor(registry, assetStore, eventBus, levelManager, versions);
        const storedWidth = () => (JSON.parse(stored.get(levelStorageKey(initial.id)) as string) as LevelMap).mapWidth;

        Engine.mapWidth = 200;
        editor.saveLevel();
        await editor.undoLevelChange();
        expect(storedWidth()).toBe(100);

        Engine.mapWidth = 300;
        editor.saveLevel();
        await editor.undoLevelChange();
        expect(storedWidth()).toBe(100);
        expect(versions.getLevelVersions(initial.id)).toHaveLength(2);

        await editor.redoLevelChange();
        expect(storedWidth()).toBe(300);
    });
});
