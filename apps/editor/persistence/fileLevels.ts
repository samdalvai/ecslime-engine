import { LevelMap, isValidLevelMap } from 'ecslime-engine';

import { getLevelName, isLevelNameTaken, resolveLevelName } from './levelNames';
import { loadLevelFromLocalStorage, saveLevelToLocalStorage } from './levelPersistence';
import { getAllLevelKeysFromLocalStorage, getNextLevelId } from './persistence';

const LINKS_KEY = 'editor-file-links';
const ACTIVE_FOLDER_KEY = 'editor-active-level-folder';
const DATABASE_NAME = 'ecslime-level-folders';

type FolderRecord = { id: string; handle: FileSystemDirectoryHandle };
type FileLink = { folderId: string; filename: string; savedHash: string; savedDraftHash: string };
type FileLinks = Record<string, FileLink>;

const readLinks = (): FileLinks => JSON.parse(localStorage.getItem(LINKS_KEY) || '{}') as FileLinks;
const writeLinks = (links: FileLinks) => localStorage.setItem(LINKS_KEY, JSON.stringify(links));
export const getFileLink = (levelId: string): FileLink | undefined => readLinks()[levelId];
export const unlinkLevelFile = (levelId: string): void => {
    const links = readLinks();
    delete links[levelId];
    writeLinks(links);
};

const hash = async (text: string): Promise<string> => {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const database = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('folders', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const folders = async (): Promise<FolderRecord[]> => {
    const db = await database();
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction('folders').objectStore('folders').getAll();
            request.onsuccess = () => resolve(request.result as FolderRecord[]);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
};

const saveFolder = async (record: FolderRecord): Promise<void> => {
    const db = await database();
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction('folders', 'readwrite');
            transaction.objectStore('folders').put(record);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } finally { db.close(); }
};

export class FileChangedError extends Error {}

export default class FileLevels {
    private folder: FolderRecord | null = null;
    private files = new Map<string, FileSystemFileHandle>();

    get folderName(): string | null { return this.folder?.handle.name ?? null; }
    get isSupported(): boolean { return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined'; }
    isConnected(levelId: string): boolean {
        const link = getFileLink(levelId);
        return !!link && link.folderId === this.folder?.id && this.files.has(link.filename);
    }

    async restore(): Promise<string[]> {
        if (!this.isSupported) return [];
        const activeId = localStorage.getItem(ACTIVE_FOLDER_KEY);
        const record = (await folders()).find(folder => folder.id === activeId);
        if (!record || await record.handle.queryPermission({ mode: 'read' }) !== 'granted') return [];
        return this.useFolder(record);
    }

    async connect(): Promise<string[]> {
        if (!this.isSupported) throw new Error('Folder access is unavailable in this browser.');
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        const existing = await folders();
        let record: FolderRecord | undefined;
        for (const candidate of existing) {
            if (await candidate.handle.isSameEntry(handle)) { record = candidate; break; }
        }
        record ??= { id: crypto.randomUUID(), handle };
        record.handle = handle;
        await saveFolder(record);
        localStorage.setItem(ACTIVE_FOLDER_KEY, record.id);
        return this.useFolder(record);
    }

    private async useFolder(record: FolderRecord): Promise<string[]> {
        this.folder = record;
        this.files.clear();
        const added: string[] = [];
        for await (const [filename, handle] of record.handle.entries()) {
            if (handle.kind !== 'file' || !filename.toLowerCase().endsWith('.json')) continue;
            const fileHandle = handle as FileSystemFileHandle;
            this.files.set(filename, fileHandle);
            const text = await (await fileHandle.getFile()).text();
            let level: LevelMap;
            try { level = JSON.parse(text) as LevelMap; } catch { continue; }
            if (!isValidLevelMap(level)) continue;
            const links = readLinks();
            const levelId = Object.keys(links).find(id => links[id].folderId === record.id && links[id].filename === filename);
            if (levelId && loadLevelFromLocalStorage(levelId)) continue; // Preserve the local draft.
            const newId = levelId ?? getNextLevelId(getAllLevelKeysFromLocalStorage());
            const baseName = getLevelName(filename.slice(0, -5), level);
            let name = resolveLevelName(newId, baseName);
            if (!name) {
                let suffix = 2;
                while (isLevelNameTaken(`${baseName} (${suffix})`)) suffix++;
                name = `${baseName} (${suffix})`;
            }
            const draft = { ...level, name };
            saveLevelToLocalStorage(newId, draft);
            links[newId] = { folderId: record.id, filename, savedHash: await hash(text), savedDraftHash: await hash(JSON.stringify(draft)) };
            writeLinks(links);
            added.push(newId);
        }
        return added;
    }

    async isDirty(levelId: string): Promise<boolean> {
        const link = getFileLink(levelId);
        const draft = loadLevelFromLocalStorage(levelId);
        return !!link && !!draft && await hash(JSON.stringify(draft)) !== link.savedDraftHash;
    }

    async save(levelId: string, newFilename?: string, overwriteChanged = false): Promise<void> {
        if (!this.folder) throw new Error('Connect the levels folder first.');
        const draft = loadLevelFromLocalStorage(levelId);
        if (!draft) throw new Error('Could not read the local level draft.');
        const existingLink = getFileLink(levelId);
        if (existingLink && existingLink.folderId !== this.folder.id) throw new Error('Connect this level’s original folder first.');
        const filename = existingLink?.filename ?? newFilename;
        if (!filename || !/^[^/\\]+\.json$/i.test(filename) || filename === '.' || filename === '..') {
            throw new Error('Choose a filename ending in .json without path separators.');
        }
        let handle = this.files.get(filename);
        if (existingLink) {
            if (!handle) throw new Error('The linked JSON file is missing.');
            const current = await (await handle.getFile()).text();
            if (!overwriteChanged && await hash(current) !== existingLink.savedHash) throw new FileChangedError('The JSON file changed on disk.');
        } else {
            try {
                await this.folder.handle.getFileHandle(filename);
                throw new Error('A JSON file with this filename already exists.');
            } catch (error) {
                if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error;
            }
            handle = await this.folder.handle.getFileHandle(filename, { create: true });
        }
        const text = JSON.stringify(draft, null, 2);
        const stream = await handle.createWritable();
        await stream.write(text);
        await stream.close();
        this.files.set(filename, handle);
        const links = readLinks();
        links[levelId] = { folderId: this.folder.id, filename, savedHash: await hash(text), savedDraftHash: await hash(JSON.stringify(draft)) };
        writeLinks(links);
    }

    async reload(levelId: string): Promise<LevelMap> {
        if (!this.isConnected(levelId)) throw new Error('Connect this level’s folder first.');
        const link = getFileLink(levelId) as FileLink;
        const text = await (await (this.files.get(link.filename) as FileSystemFileHandle).getFile()).text();
        const level = JSON.parse(text) as LevelMap;
        if (!isValidLevelMap(level)) throw new Error('The JSON file is not a valid level.');
        const name = resolveLevelName(levelId, level.name || link.filename.slice(0, -5), levelId);
        if (!name) throw new Error('The JSON file has the same level name as another level.');
        const draft = { ...level, name };
        saveLevelToLocalStorage(levelId, draft);
        const links = readLinks();
        links[levelId] = { ...link, savedHash: await hash(text), savedDraftHash: await hash(JSON.stringify(draft)) };
        writeLinks(links);
        return draft;
    }
}
