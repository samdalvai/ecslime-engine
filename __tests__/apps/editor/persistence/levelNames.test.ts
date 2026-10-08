import { describe, expect, test } from '@jest/globals';
import { AssetStore, Engine, EventBus, LevelManager, LevelMap, Registry } from 'ecslime-engine';

import Editor from '../../../../apps/editor/Editor';
import EntityEditor from '../../../../apps/editor/entity-editor/EntityEditor';
import { resolveLevelName } from '../../../../apps/editor/persistence/levelNames';
import {
    saveLevelToJson,
    saveLevelToLocalStorage,
    serializeStoredLevel,
} from '../../../../apps/editor/persistence/levelPersistence';
import { levelStorageKey } from '../../../../apps/editor/persistence/persistence';
import VersionManager from '../../../../apps/editor/version-manager/VersionManager';

const emptyLevel = (id: string, name: string): LevelMap => ({
    id,
    name,
    textures: [],
    sounds: [],
    mapWidth: 640,
    mapHeight: 640,
    entities: [],
});

const mockStorage = () => {
    const data = new Map<string, string>();
    let reads = 0;
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: {
            get length() {
                return data.size;
            },
            key: (index: number) => [...data.keys()][index] ?? null,
            getItem: (key: string) => {
                reads++;
                return data.get(key) ?? null;
            },
            setItem: (key: string, value: string) => data.set(key, value),
            removeItem: (key: string) => data.delete(key),
        },
    });
    const read = (id: string): LevelMap => JSON.parse(data.get(levelStorageKey(id)) as string);
    const write = (level: LevelMap) => data.set(levelStorageKey(level.id), JSON.stringify(level));
    return { data, read, write, getReads: () => reads };
};

const assetStore = {
    getTexturesFilePaths: () => [],
    getSoundsFilePaths: () => [],
} as unknown as AssetStore;

describe('level identity', () => {
    test('requires a unique nonblank name and allows renaming the same level', () => {
        const { write } = mockStorage();
        write(emptyLevel('level-0', 'Forest'));

        expect(resolveLevelName('  ')).toBeNull();
        expect(resolveLevelName(' forest ')).toBeNull();
        expect(resolveLevelName(' Cave ')).toBe('Cave');
        expect(resolveLevelName(' forest ', 'level-0')).toBe('forest');
    });

    test('stores a level under its own ID and preserves the required name', () => {
        const { data, read } = mockStorage();
        saveLevelToLocalStorage(emptyLevel('level-1', 'Cave'));

        expect(read('level-1')).toEqual(emptyLevel('level-1', 'Cave'));
        expect(data.has('level-1')).toBe(false);
    });

    test('serializes content with stored identity using one storage read', () => {
        const { write, getReads } = mockStorage();
        write(emptyLevel('level-0', 'Forest'));
        const level = serializeStoredLevel('level-0', new Registry(), assetStore);

        expect(level.id).toBe('level-0');
        expect(level.name).toBe('Forest');
        expect(level.entities).toEqual([]);
        expect(getReads()).toBe(1);
    });

    test('exports a JSON blob with the stored identity and a normalized name', async () => {
        const { write, getReads } = mockStorage();
        write(emptyLevel('level-0', 'Forest Cave'));
        const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
        const oldCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
        const oldRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
        let blob: Blob | undefined;
        const link = { href: '', download: '', click: () => undefined };
        Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => link } });
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: (value: Blob) => {
                blob = value;
                return 'blob:level';
            },
        });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
        try {
            saveLevelToJson('level-0', new Registry(), assetStore);
            expect(link.download).toBe('Forest-Cave.json');
            expect(JSON.parse(await (blob as Blob).text())).toMatchObject({ id: 'level-0', name: 'Forest Cave' });
            expect(getReads()).toBe(1);
        } finally {
            if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
            else delete (globalThis as { document?: Document }).document;
            if (oldCreate) Object.defineProperty(URL, 'createObjectURL', oldCreate);
            else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
            if (oldRevoke) Object.defineProperty(URL, 'revokeObjectURL', oldRevoke);
            else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
        }
    });

    test('undo and redo preserve current identity instead of restoring old names', async () => {
        const { read, write } = mockStorage();
        write(emptyLevel('level-0', 'New name'));
        Editor.editorSettings.selectedLevel = 'level-0';
        const versions = new VersionManager();
        versions.addLevelVersion('level-0', { ...emptyLevel('level-0', 'Old name'), mapWidth: 500 });
        versions.addLevelVersion('level-0', { ...emptyLevel('level-0', 'Old name'), mapWidth: 700 });
        const manager = {
            loadLevelFromLevelMap: async (level: LevelMap) => {
                Engine.mapWidth = level.mapWidth;
                Engine.mapHeight = level.mapHeight;
            },
        } as unknown as LevelManager;
        const eventBus = { emitEvent: () => undefined } as unknown as EventBus;
        const editor = new EntityEditor(new Registry(), assetStore, eventBus, manager, versions);

        await editor.undoLevelChange();
        expect(read('level-0')).toMatchObject({ id: 'level-0', name: 'New name', mapWidth: 500 });
        await editor.redoLevelChange();
        expect(read('level-0')).toMatchObject({ id: 'level-0', name: 'New name', mapWidth: 700 });
    });
});
