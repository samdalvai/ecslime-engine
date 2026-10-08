import { afterEach, describe, expect, test } from '@jest/globals';
import { AssetStore, LevelManager, LevelMap, Registry } from 'ecslime-engine';

import Editor from '../../../../apps/editor/Editor';
import EntityEditor from '../../../../apps/editor/entity-editor/EntityEditor';
import { saveLevelToLocalStorage } from '../../../../apps/editor/persistence/levelPersistence';
import { levelStorageKey } from '../../../../apps/editor/persistence/persistence';
import SidebarController from '../../../../apps/editor/sidebar/SidebarController';

class NodeStub {
    children: NodeStub[] = [];
    value = '';
    id = '';
    textContent = '';
    files: File[] | null = null;
    onclick: (() => void | Promise<void>) | null = null;
    onchange: ((event?: { target: NodeStub }) => void | Promise<void>) | null = null;
    private changeListener: (() => void) | null = null;
    classList = { remove: () => undefined };

    appendChild(node: NodeStub) {
        this.children.push(node);
    }
    replaceChildren() {
        this.children = [];
    }
    addEventListener(type: string, listener: () => void) {
        if (type === 'change') this.changeListener = listener;
    }
    emitChange() {
        this.changeListener?.();
    }
    click() {
        /* A file selection is supplied by the test. */
    }
    focus() {}
}

const makeLevel = (id: string, name: string): LevelMap => ({
    id,
    name,
    textures: [],
    sounds: [],
    mapWidth: 640,
    mapHeight: 640,
    entities: [],
});

const originalGlobals = Object.fromEntries(
    ['document', 'window', 'localStorage', 'crypto', 'FileReader'].map(name => [
        name,
        Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
) as Record<string, PropertyDescriptor | undefined>;

afterEach(() => {
    for (const [name, descriptor] of Object.entries(originalGlobals)) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
    }
    Editor.editorSettings.selectedLevel = null;
    Editor.alertShown = false;
});

const setup = () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            get length() {
                return data.size;
            },
            key: (index: number) => [...data.keys()][index] ?? null,
            getItem: (key: string) => data.get(key) ?? null,
            setItem: (key: string, value: string) => data.set(key, value),
            removeItem: (key: string) => data.delete(key),
        },
    });
    saveLevelToLocalStorage(makeLevel('existing', 'Starter'));
    Editor.editorSettings.selectedLevel = 'existing';

    const select = new NodeStub();
    const create = new NodeStub();
    const name = new NodeStub();
    const remove = new NodeStub();
    const exportButton = new NodeStub();
    const importButton = new NodeStub();
    const width = new NodeStub();
    const height = new NodeStub();
    const alert = new NodeStub();
    const alertMessage = new NodeStub();
    const rightNodes: Record<string, NodeStub> = {
        '#level-name': name,
        '#export-to-json': exportButton,
        '#load-from-json': importButton,
        '#map-width': width,
        '#map-height': height,
    };
    const right = { querySelector: (selector: string) => rightNodes[selector] ?? null } as unknown as HTMLElement;
    const left = {} as HTMLElement;
    let fileInput: NodeStub | null = null;
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            activeElement: null,
            querySelector: (selector: string) =>
                (
                    ({
                        '#local-storage-levels': select,
                        '#new-level': create,
                        '#delete-level': remove,
                    }) as Record<string, NodeStub>
                )[selector] ?? null,
            getElementById: (id: string) =>
                (
                    ({
                        'custom-alert': alert,
                        'custom-alert-message': alertMessage,
                    }) as Record<string, NodeStub>
                )[id] ??
                select.children.find(option => option.id === id) ??
                null,
            createElement: (tag: string) => {
                const node = new NodeStub();
                if (tag === 'input') fileInput = node;
                return node;
            },
        },
    });
    let promptValue: string | null = null;
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { prompt: () => promptValue, confirm: () => true },
    });
    Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: { randomUUID: () => 'generated-id' },
    });
    const loaded: LevelMap[] = [];
    const levelManager = {
        getDefaultLevel: makeLevel,
        loadLevelFromLevelMap: async (level: LevelMap) => {
            loaded.push(level);
            return level;
        },
    } as unknown as LevelManager;
    const entityEditor = { flushSave: () => undefined, saveLevel: () => undefined } as unknown as EntityEditor;
    const controller = new SidebarController(entityEditor);
    Reflect.set(controller, 'renderEntityList', () => undefined);
    Reflect.set(controller, 'renderSelection', () => undefined);
    const renderLevelManagement = Reflect.get(controller, 'renderLevelManagement') as (
        right: HTMLElement,
        left: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        manager: LevelManager,
    ) => void;
    renderLevelManagement.call(controller, right, left, new Registry(), {} as AssetStore, levelManager);
    const read = (id: string): LevelMap | undefined => {
        const json = data.get(levelStorageKey(id));
        return json ? (JSON.parse(json) as LevelMap) : undefined;
    };
    return {
        data,
        read,
        loaded,
        select,
        create,
        name,
        importButton,
        alertMessage,
        setPrompt: (value: string | null) => {
            promptValue = value;
        },
        getFileInput: () => fileInput,
    };
};

describe('sidebar level management', () => {
    test('requires a unique name, then creates, renames, and selects by stable ID', async () => {
        const ui = setup();
        ui.setPrompt('  ');
        await ui.create.onclick?.();
        expect(ui.read('generated-id')).toBeUndefined();

        ui.setPrompt(' starter ');
        await ui.create.onclick?.();
        expect(ui.read('generated-id')).toBeUndefined();

        ui.setPrompt(' Forest Cave ');
        await ui.create.onclick?.();
        expect(ui.read('generated-id')).toMatchObject({ id: 'generated-id', name: 'Forest Cave' });
        expect(Editor.editorSettings.selectedLevel).toBe('generated-id');
        expect(ui.loaded.at(-1)).toMatchObject({ id: 'generated-id', name: 'Forest Cave' });

        ui.name.value = '  ';
        await ui.name.onchange?.();
        expect(ui.read('generated-id')?.name).toBe('Forest Cave');
        ui.name.value = 'Woodland';
        await ui.name.onchange?.();
        expect(ui.read('generated-id')?.name).toBe('Woodland');
        expect(ui.read('generated-id')?.id).toBe('generated-id');

        await ui.select.onchange?.({ target: Object.assign(new NodeStub(), { value: 'existing' }) });
        expect(Editor.editorSettings.selectedLevel).toBe('existing');
        expect(ui.name.value).toBe('Starter');
    });

    test('imports with a new ID and rejects a duplicate name', async () => {
        const ui = setup();
        let importedJson = JSON.stringify(makeLevel('external-id', 'Cave'));
        let readResult: Promise<void> | undefined;
        class FileReaderStub {
            result: string | null = null;
            onload: (() => Promise<void>) | null = null;
            readAsText() {
                this.result = importedJson;
                readResult = this.onload?.();
            }
        }
        Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: FileReaderStub });
        const importFile = async () => {
            ui.importButton.onclick?.();
            const input = ui.getFileInput();
            if (!input) throw new Error('Import input was not created');
            input.files = [{} as File];
            input.emitChange();
            await readResult;
        };

        await importFile();
        expect(ui.read('generated-id')).toMatchObject({ id: 'generated-id', name: 'Cave' });
        expect(ui.read('external-id')).toBeUndefined();
        expect(Editor.editorSettings.selectedLevel).toBe('generated-id');

        importedJson = JSON.stringify(makeLevel('another-id', 'Starter'));
        await importFile();
        expect(ui.read('another-id')).toBeUndefined();
        expect(ui.alertMessage.textContent).toContain('already exists');
    });
});
