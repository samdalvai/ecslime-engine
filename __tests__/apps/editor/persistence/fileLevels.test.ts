import { LevelMap } from 'ecslime-engine';

import FileLevels, { FileChangedError, getFileLink } from '../../../../apps/editor/persistence/fileLevels';
import { loadLevelFromLocalStorage, saveLevelToLocalStorage } from '../../../../apps/editor/persistence/levelPersistence';

const level = (name = 'Grass'): LevelMap => ({ name, textures: [], sounds: [], mapWidth: 640, mapHeight: 640, entities: [] });

const storage = () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        get length() { return data.size; },
        key: (index: number) => [...data.keys()][index] ?? null,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
    } });
};

class FakeFile {
    kind = 'file';
    constructor(public text: string) {}
    async getFile() { return { text: async () => this.text }; }
    async createWritable() { return { write: async (text: string) => { this.text = text; }, close: async () => undefined }; }
}

class FakeFolder {
    name = 'levels';
    files = new Map<string, FakeFile>();
    async *entries() { for (const entry of this.files) yield entry; }
    async getFileHandle(name: string, options?: { create?: boolean }) {
        const file = this.files.get(name);
        if (file) return file;
        if (!options?.create) throw new DOMException('Missing', 'NotFoundError');
        const created = new FakeFile('');
        this.files.set(name, created);
        return created;
    }
}

const useFolder = (service: FileLevels, id: string, folder: FakeFolder): Promise<string[]> =>
    (service as unknown as { useFolder: (record: { id: string; handle: FileSystemDirectoryHandle }) => Promise<string[]> })
        .useFolder({ id, handle: folder as unknown as FileSystemDirectoryHandle });

describe('file-backed levels', () => {
    test('opens JSON files and restores a local draft on reconnect', async () => {
        storage();
        const folder = new FakeFolder();
        folder.files.set('grass.json', new FakeFile(JSON.stringify(level())));
        folder.files.set('notes.txt', new FakeFile('ignore'));
        const service = new FileLevels();
        expect(await useFolder(service, 'folder-a', folder)).toEqual(['level-0']);
        expect(getFileLink('level-0')?.filename).toBe('grass.json');
        saveLevelToLocalStorage('level-0', level('Edited draft'));
        expect(await useFolder(service, 'folder-a', folder)).toEqual([]);
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('Edited draft');
        expect(await service.isDirty('level-0')).toBe(true);
    });

    test('keeps imported file names unique and skips invalid JSON', async () => {
        storage();
        const folder = new FakeFolder();
        folder.files.set('grass.json', new FakeFile(JSON.stringify(level('Cave'))));
        folder.files.set('test.json', new FakeFile(JSON.stringify(level('cave'))));
        folder.files.set('broken.json', new FakeFile('{invalid'));
        const service = new FileLevels();
        expect(await useFolder(service, 'folder-a', folder)).toEqual(['level-0', 'level-1']);
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('Cave');
        expect(loadLevelFromLocalStorage('level-1')?.name).toBe('cave (2)');
    });

    test('saves a draft and detects an external file change before overwriting', async () => {
        storage();
        const folder = new FakeFolder();
        const file = new FakeFile(JSON.stringify(level()));
        folder.files.set('grass.json', file);
        const service = new FileLevels();
        await useFolder(service, 'folder-a', folder);
        saveLevelToLocalStorage('level-0', level('Edited'));
        await service.save('level-0');
        expect(JSON.parse(file.text).name).toBe('Edited');
        expect(await service.isDirty('level-0')).toBe(false);
        file.text = JSON.stringify(level('External'));
        saveLevelToLocalStorage('level-0', level('More edits'));
        await expect(service.save('level-0')).rejects.toBeInstanceOf(FileChangedError);
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('More edits');
        await service.reload('level-0');
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('External');
    });

    test('creates a new named file once and keeps drafts tied to the original folder', async () => {
        storage();
        const first = new FakeFolder();
        const second = new FakeFolder();
        second.files.set('grass.json', new FakeFile(JSON.stringify(level('Other'))));
        const service = new FileLevels();
        await useFolder(service, 'folder-a', first);
        saveLevelToLocalStorage('level-0', level());
        await service.save('level-0', 'grass.json');
        expect(JSON.parse(first.files.get('grass.json')?.text as string).name).toBe('Grass');
        await useFolder(service, 'folder-b', second);
        await expect(service.save('level-0')).rejects.toThrow('original folder');
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('Grass');
    });

    test('keeps the draft when write permission is denied', async () => {
        storage();
        const folder = new FakeFolder();
        const file = new FakeFile(JSON.stringify(level()));
        folder.files.set('grass.json', file);
        const service = new FileLevels();
        await useFolder(service, 'folder-a', folder);
        saveLevelToLocalStorage('level-0', level('Unsaved'));
        file.createWritable = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
        await expect(service.save('level-0')).rejects.toMatchObject({ name: 'NotAllowedError' });
        expect(loadLevelFromLocalStorage('level-0')?.name).toBe('Unsaved');
        expect(JSON.parse(file.text).name).toBe('Grass');
    });

    test('leaves drafts unchanged when the folder picker is canceled', async () => {
        storage();
        saveLevelToLocalStorage('level-0', level('Draft'));
        const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
        const oldIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
        Object.defineProperty(globalThis, 'window', { configurable: true, value: {
            showDirectoryPicker: async () => { throw new DOMException('Canceled', 'AbortError'); },
        } });
        Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: {} });
        try {
            await expect(new FileLevels().connect()).rejects.toMatchObject({ name: 'AbortError' });
            expect(loadLevelFromLocalStorage('level-0')?.name).toBe('Draft');
        } finally {
            if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
            else Reflect.deleteProperty(globalThis, 'window');
            if (oldIndexedDb) Object.defineProperty(globalThis, 'indexedDB', oldIndexedDb);
            else Reflect.deleteProperty(globalThis, 'indexedDB');
        }
    });

    test('rejects existing filenames and invalid paths for new levels', async () => {
        storage();
        const folder = new FakeFolder();
        folder.files.set('grass.json', new FakeFile(JSON.stringify(level())));
        const service = new FileLevels();
        await useFolder(service, 'folder-a', folder);
        saveLevelToLocalStorage('level-1', level('New'));
        await expect(service.save('level-1', 'grass.json')).rejects.toThrow('already exists');
        await expect(service.save('level-1', '../new.json')).rejects.toThrow('filename');
    });
});
