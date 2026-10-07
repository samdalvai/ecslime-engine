import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { Entity, Registry } from 'ecslime-engine';

import Editor from '../../../../apps/editor/Editor';
import EntityEditor from '../../../../apps/editor/entity-editor/EntityEditor';
import RenderSidebarSystem from '../../../../apps/editor/systems/RenderSidebarSystem';

class NodeStub {
    children: NodeStub[] = [];
    dataset: Record<string, string> = {};
    attributes: Record<string, string> = {};
    className = '';
    textContent = '';
    value = '';
    disabled = false;
    onclick: ((event: { shiftKey: boolean }) => void) | null = null;
    oninput: (() => void) | null = null;

    constructor(readonly tag: string) {}

    append(...nodes: NodeStub[]) {
        for (const node of nodes) {
            this.children.push(...(node.tag === 'fragment' ? node.children : [node]));
        }
    }

    replaceChildren() {
        this.children = [];
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }
}

const makeEntity = (id: number) => ({
    getId: () => id,
    getTag: () => undefined,
    getGroup: () => undefined,
    toBeKilled: false,
}) as unknown as Entity;

describe('Batched editor sidebar rendering', () => {
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalRequestFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
    const originalCancelFrame = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
    let nodes: Record<string, NodeStub>;
    let frames: Map<number, FrameRequestCallback>;
    let nextFrameId: number;

    beforeEach(() => {
        nodes = {};
        frames = new Map();
        nextFrameId = 1;
        Object.defineProperty(globalThis, 'document', {
            configurable: true,
            value: {
                getElementById: (id: string) => nodes[id] ?? null,
                createElement: (tag: string) => new NodeStub(tag),
                createDocumentFragment: () => new NodeStub('fragment'),
            },
        });
        Object.defineProperty(globalThis, 'requestAnimationFrame', {
            configurable: true,
            value: (callback: FrameRequestCallback) => {
                const id = nextFrameId++;
                frames.set(id, callback);
                return id;
            },
        });
        Object.defineProperty(globalThis, 'cancelAnimationFrame', {
            configurable: true,
            value: (id: number) => frames.delete(id),
        });
        Editor.selectedEntities = [];
    });

    afterEach(() => {
        for (const [name, descriptor] of [
            ['document', originalDocument],
            ['requestAnimationFrame', originalRequestFrame],
            ['cancelAnimationFrame', originalCancelFrame],
        ] as const) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
        Editor.selectedEntities = [];
    });

    const nextFrame = (frames: Map<number, FrameRequestCallback>) => {
        const [id, callback] = frames.entries().next().value as [number, FrameRequestCallback];
        frames.delete(id);
        callback(0);
    };

    test('renders selected entity forms in batches and cancels stale work', () => {
        nodes['inspector-list'] = new NodeStub('ul');
        nodes['selection-status'] = new NodeStub('span');
        const editor = { getEntityListElement: (entity: Entity) => new NodeStub(`entity-${entity.getId()}`) };
        const system = new RenderSidebarSystem(editor as unknown as EntityEditor);
        const renderSelection = (system as unknown as { renderSelection: () => void }).renderSelection;
        Editor.selectedEntities = Array.from({ length: 45 }, (_, index) => makeEntity(index));

        renderSelection();
        expect(nodes['inspector-list'].children).toHaveLength(20);
        expect(frames).toHaveProperty('size', 1);
        const staleCallback = frames.values().next().value as FrameRequestCallback;
        Editor.selectedEntities = [makeEntity(99)];
        renderSelection();
        staleCallback(0);
        expect(nodes['inspector-list'].children.map(node => node.tag)).toEqual(['entity-99']);

        Editor.selectedEntities = Array.from({ length: 45 }, (_, index) => makeEntity(index));
        renderSelection();
        nextFrame(frames);
        expect(nodes['inspector-list'].children).toHaveLength(40);
        nextFrame(frames);
        expect(nodes['inspector-list'].children).toHaveLength(45);
    });

    test('renders the all-entity list in batches', () => {
        const list = new NodeStub('ul');
        const search = new NodeStub('input');
        const count = new NodeStub('p');
        const add = new NodeStub('button');
        const importButton = new NodeStub('button');
        const exportButton = new NodeStub('button');
        const parts: Record<string, NodeStub> = {
            '#entity-list': list,
            '#entity-search': search,
            '#entity-count': count,
            '#add-entity': add,
            '#import-entities': importButton,
            '#export-entities': exportButton,
        };
        const sidebar = { querySelector: (selector: string) => parts[selector] ?? null } as unknown as HTMLElement;
        const system = new RenderSidebarSystem({} as EntityEditor);
        const entities = Array.from({ length: 125 }, (_, index) => makeEntity(index));
        Reflect.set(system, 'registry', { getAllEntities: () => entities } as unknown as Registry);
        const renderEntityList = (system as unknown as { renderEntityList: (sidebar: HTMLElement) => void }).renderEntityList;

        renderEntityList(sidebar);
        expect(list.children).toHaveLength(60);
        nextFrame(frames);
        expect(list.children).toHaveLength(120);
        nextFrame(frames);
        expect(list.children).toHaveLength(125);
        expect(count.textContent).toBe('125 of 125 entities');
    });
});
