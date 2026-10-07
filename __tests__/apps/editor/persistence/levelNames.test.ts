import { AssetStore, Engine, EventBus, LevelManager, LevelMap, Registry } from 'ecslime-engine';

import Editor from '../../../../apps/editor/Editor';
import EntityEditor from '../../../../apps/editor/entity-editor/EntityEditor';
import { saveLevelToJson, saveLevelToLocalStorage, serializeNamedLevel } from '../../../../apps/editor/persistence/levelPersistence';
import { resolveLevelName } from '../../../../apps/editor/persistence/levelNames';
import VersionManager from '../../../../apps/editor/version-manager/VersionManager';

const emptyLevel = (name?: string): LevelMap => ({ name, textures: [], sounds: [], mapWidth: 640, mapHeight: 640, entities: [] });

const mockStorage = () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            get length() { return data.size; },
            key: (index: number) => [...data.keys()][index] ?? null,
            getItem: (key: string) => data.get(key) ?? null,
            setItem: (key: string, value: string) => data.set(key, value),
            removeItem: (key: string) => data.delete(key),
        },
    });
    const read = (id: string): LevelMap => JSON.parse(data.get(id) as string);
    const write = (id: string, level: LevelMap) => data.set(id, JSON.stringify(level));
    return { data, read, write };
};

const assetStore = {
    getTexturesFilePaths: () => [],
    getSoundsFilePaths: () => [],
} as unknown as AssetStore;

describe('level names', () => {
    test('uses a generated name for blank names and rejects case-insensitive duplicates', () => {
        const { write } = mockStorage();
        write('level-0', emptyLevel('Forest'));
        write('level-1', emptyLevel('level-2'));

        expect(resolveLevelName('level-3', ' forest ')).toBeNull();
        expect(resolveLevelName('level-3', ' Cave ')).toBe('Cave');
        expect(resolveLevelName('level-2', '')).toBe('level-2 (2)');
        expect(resolveLevelName('level-0', ' forest ', 'level-0')).toBe('forest');
        expect(resolveLevelName('level-3', undefined)).toBe('level-3');
    });

    test('accepts named and unnamed imports while rejecting an existing name', () => {
        const { data, read, write } = mockStorage();
        write('level-0', emptyLevel('Forest'));
        const named = resolveLevelName('level-1', ' Cave ');
        expect(named).toBe('Cave');
        saveLevelToLocalStorage('level-1', { ...emptyLevel(), name: named as string });
        expect(read('level-1').name).toBe('Cave');

        const unnamed = resolveLevelName('level-2', undefined);
        saveLevelToLocalStorage('level-2', { ...emptyLevel(), name: unnamed as string });
        expect(read('level-2').name).toBe('level-2');
        expect(resolveLevelName('level-3', 'cave')).toBeNull();
        expect(data.has('level-3')).toBe(false);
    });

    test('serializes the stored name into the same level map used by autosave and export', () => {
        const { write } = mockStorage();
        write('level-0', emptyLevel('Forest'));
        const level = serializeNamedLevel('level-0', new Registry(), assetStore);
        expect(level.name).toBe('Forest');
        expect(level.entities).toEqual([]);
    });

    test('exports a JSON blob containing the stored name', async () => {
        const { write } = mockStorage();
        write('level-0', emptyLevel('Forest'));
        const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
        const oldCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
        const oldRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
        let blob: Blob | undefined;
        const link = { href: '', download: '', click: () => undefined };
        Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => link } });
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (value: Blob) => { blob = value; return 'blob:level'; } });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
        try {
            saveLevelToJson('level-0', new Registry(), assetStore);
            expect(link.download).toBe('snapshot.json');
            expect(JSON.parse(await (blob as Blob).text()).name).toBe('Forest');
        } finally {
            if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
            else delete (globalThis as { document?: Document }).document;
            if (oldCreate) Object.defineProperty(URL, 'createObjectURL', oldCreate);
            else delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
            if (oldRevoke) Object.defineProperty(URL, 'revokeObjectURL', oldRevoke);
            else delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
        }
    });

    test('undo and redo preserve the current name instead of restoring old snapshot names', async () => {
        const { read, write } = mockStorage();
        write('level-0', emptyLevel('New name'));
        Editor.editorSettings.selectedLevel = 'level-0';
        const versions = new VersionManager();
        versions.addLevelVersion('level-0', { ...emptyLevel('Old name'), mapWidth: 500 });
        versions.addLevelVersion('level-0', { ...emptyLevel('Old name'), mapWidth: 700 });
        const manager = {
            loadLevelFromLevelMap: async (level: LevelMap) => { Engine.mapWidth = level.mapWidth; Engine.mapHeight = level.mapHeight; },
        } as unknown as LevelManager;
        const eventBus = { emitEvent: () => undefined } as unknown as EventBus;
        const editor = new EntityEditor(new Registry(), assetStore, eventBus, manager, versions);

        await editor.undoLevelChange();
        expect(read('level-0').name).toBe('New name');
        expect(read('level-0').mapWidth).toBe(500);
        await editor.redoLevelChange();
        expect(read('level-0').name).toBe('New name');
        expect(read('level-0').mapWidth).toBe(700);
    });
});
