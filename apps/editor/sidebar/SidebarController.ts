import {
    AssetStore,
    Engine,
    Entity,
    EventBus,
    LevelManager,
    LevelMap,
    Registry,
    deserializeEntity,
    isValidLevelMap,
} from 'ecslime-engine';

import { gameComponentCatalog } from '../../game/catalog/gameComponentCatalog';
import { TransformComponent } from '../../game/components';
import EntityKilledEvent from '../../game/events/EntityKilledEvent';
import * as GameSystems from '../../game/systems';
import Editor from '../Editor';
import EntityEditor from '../entity-editor/EntityEditor';
import EntityDeleteEvent from '../events/EntityDeleteEvent';
import EntityDuplicateEvent from '../events/EntityDuplicateEvent';
import EntityPasteEvent from '../events/EntityPasteEvent';
import EntitySelectEvent from '../events/EntitySelectEvent';
import EntityUpdateEvent from '../events/EntityUpdateEvent';
import { createInput, createListItem, showAlert } from '../gui';
import { getLevelName, resolveLevelName } from '../persistence/levelNames';
import {
    loadLevelFromLocalStorage,
    saveEntitiesToJson,
    saveLevelToJson,
    saveLevelToLocalStorage,
} from '../persistence/levelPersistence';
import {
    deleteLevelFromLocalStorage,
    getAllLevelKeysFromLocalStorage,
    getNextLevelId,
    saveEditorSettingsToLocalStorage,
} from '../persistence/persistence';

export default class SidebarController {
    private readonly entityListBatchSize = 60;
    private readonly selectionBatchSize = 20;
    private entityListRenderFrame: number | null = null;
    private entityListRenderToken = 0;
    private selectionRenderFrame: number | null = null;
    private selectionRenderToken = 0;
    private entityEditor: EntityEditor;
    private registry: Registry | null = null;
    private leftSidebar: HTMLElement | null = null;
    private entityChangedListenerBound = false;

    constructor(entityEditor: EntityEditor) {
        this.entityEditor = entityEditor;
    }

    subscribeToEvents(eventBus: EventBus, registry: Registry, leftSidebar: HTMLElement) {
        eventBus.subscribeToEvent(EntitySelectEvent, this, event => this.onEntitySelect(event, leftSidebar));
        eventBus.subscribeToEvent(EntityDeleteEvent, this, event => this.onEntityDelete(event, leftSidebar));
        eventBus.subscribeToEvent(EntityDuplicateEvent, this, event =>
            this.onEntityDuplicate(event, leftSidebar, eventBus),
        );
        eventBus.subscribeToEvent(EntityPasteEvent, this, event =>
            this.onEntityPaste(event, leftSidebar, eventBus, registry),
        );
        eventBus.subscribeToEvent(EntityKilledEvent, this, () => this.onEntityKilled());
        eventBus.subscribeToEvent(EntityUpdateEvent, this, () => {
            Editor.selectedEntities = [];
            this.renderEntityList(leftSidebar);
            this.renderSelection();
        });
    }

    onEntitySelect = (event: EntitySelectEvent, leftSidebar: HTMLElement) => {
        Editor.selectedEntities = event.entities;
        this.updateEntitySelectionInList(leftSidebar);
        this.renderSelection();
        leftSidebar.querySelector('.entity-row[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
    };

    onEntityDelete = (event: EntityDeleteEvent, leftSidebar: HTMLElement) => {
        this.entityEditor.removeEntity(event.entity);
        Editor.selectedEntities = Editor.selectedEntities.filter(entity => entity.getId() !== event.entity.getId());
        this.renderEntityList(leftSidebar);
        this.renderSelection();
    };

    onEntityDuplicate = (event: EntityDuplicateEvent, leftSidebar: HTMLElement, eventBus: EventBus) => {
        const copy = event.entity.duplicate(gameComponentCatalog);
        Editor.selectedEntities = [copy];
        eventBus.emitEvent(EntitySelectEvent, [copy]);
        this.renderEntityList(leftSidebar);
        this.renderSelection();
        this.entityEditor.saveLevel();
    };

    onEntityPaste = (event: EntityPasteEvent, leftSidebar: HTMLElement, eventBus: EventBus, registry: Registry) => {
        if (event.entities.length === 0) return;
        const copies: Entity[] = [];
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        for (const entityMap of event.entities) {
            const copy = deserializeEntity(JSON.parse(JSON.stringify(entityMap)), registry, gameComponentCatalog);
            registry.update();
            const position = copy.getComponent(TransformComponent).position;
            minX = Math.min(minX, position.x);
            minY = Math.min(minY, position.y);
            copies.push(copy);
        }
        Editor.entityDragStart = { x: minX, y: minY };
        Editor.isDragging = true;
        Editor.selectedEntities = copies;
        eventBus.emitEvent(EntitySelectEvent, copies);
        this.renderEntityList(leftSidebar);
        this.renderSelection();
        this.entityEditor.saveLevel();
    };

    onEntityKilled = () => {
        if (!this.leftSidebar) return;
        Editor.selectedEntities = Editor.selectedEntities.filter(entity => !entity.toBeKilled);
        this.renderEntityList(this.leftSidebar);
        this.renderSelection();
        this.entityEditor.saveLevel();
    };

    refresh(
        leftSidebar: HTMLElement,
        rightSidebar: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        levelManager: LevelManager,
    ) {
        this.registry = registry;
        this.leftSidebar = leftSidebar;
        this.renderEntityList(leftSidebar);
        this.renderSelection();
        this.renderActiveSystems(rightSidebar);
        this.renderLevelSettings(rightSidebar);
        this.renderLevelManagement(rightSidebar, leftSidebar, registry, assetStore, levelManager);
        if (!this.entityChangedListenerBound) {
            document.addEventListener('editor:entity-changed', () => {
                if (this.leftSidebar) this.renderEntityList(this.leftSidebar);
            });
            this.entityChangedListenerBound = true;
        }
    }

    private cancelEntityListRender = () => {
        this.entityListRenderToken++;
        if (this.entityListRenderFrame !== null) cancelAnimationFrame(this.entityListRenderFrame);
        this.entityListRenderFrame = null;
    };

    private cancelSelectionRender = () => {
        this.selectionRenderToken++;
        if (this.selectionRenderFrame !== null) cancelAnimationFrame(this.selectionRenderFrame);
        this.selectionRenderFrame = null;
    };

    private updateEntitySelectionInList = (leftSidebar: HTMLElement) => {
        const selectedIds = new Set(Editor.selectedEntities.map(entity => entity.getId()));
        for (const row of leftSidebar.querySelectorAll<HTMLButtonElement>('.entity-row')) {
            row.setAttribute('aria-pressed', String(selectedIds.has(Number(row.dataset.entityId))));
        }
        const exportButton = leftSidebar.querySelector('#export-entities') as HTMLButtonElement | null;
        if (exportButton) exportButton.disabled = selectedIds.size === 0;
    };

    private renderEntityList = (leftSidebar: HTMLElement) => {
        if (!this.registry) return;
        const list = leftSidebar.querySelector('#entity-list') as HTMLUListElement;
        const search = leftSidebar.querySelector('#entity-search') as HTMLInputElement;
        const count = leftSidebar.querySelector('#entity-count') as HTMLElement;
        const add = leftSidebar.querySelector('#add-entity') as HTMLButtonElement;
        const importButton = leftSidebar.querySelector('#import-entities') as HTMLButtonElement;
        const exportButton = leftSidebar.querySelector('#export-entities') as HTMLButtonElement;
        if (!list || !search || !count || !add || !importButton || !exportButton) return;
        add.onclick = () => {
            this.entityEditor.addEntity();
            this.renderEntityList(leftSidebar);
            this.renderSelection();
        };
        importButton.onclick = () => this.entityEditor.importEntities();
        exportButton.onclick = () => {
            if (Editor.selectedEntities.length) saveEntitiesToJson(Editor.selectedEntities);
            else showAlert('Select an entity to export.');
        };
        search.oninput = () => this.renderEntityList(leftSidebar);
        const entities = Array.from(this.registry.getAllEntities()).filter(entity => !entity.toBeKilled);
        entities.sort((a, b) => a.getId() - b.getId());
        const query = search.value.trim().toLowerCase();
        const filtered = entities.filter(entity =>
            `${entity.getTag() ?? ''} ${entity.getGroup() ?? ''} ${entity.getId()}`.toLowerCase().includes(query),
        );
        this.cancelEntityListRender();
        list.replaceChildren();
        count.textContent = `${filtered.length} of ${entities.length} entities`;
        exportButton.disabled = Editor.selectedEntities.length === 0;
        if (!filtered.length) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = query ? 'No entities match your search.' : 'No entities yet. Add one to start.';
            list.append(empty);
            return;
        }

        let entityIndex = 0;
        const renderToken = this.entityListRenderToken;
        const renderNextBatch = () => {
            if (renderToken !== this.entityListRenderToken) return;
            const selectedIds = new Set(Editor.selectedEntities.map(entity => entity.getId()));
            const fragment = document.createDocumentFragment();
            const batchEnd = Math.min(entityIndex + this.entityListBatchSize, filtered.length);
            while (entityIndex < batchEnd) {
                const entity = filtered[entityIndex++];
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'entity-row';
                button.dataset.entityId = String(entity.getId());
                button.setAttribute('aria-pressed', String(selectedIds.has(entity.getId())));
                const name = document.createElement('span');
                name.className = 'entity-name';
                name.textContent = entity.getTag() || entity.getGroup() || 'Untitled entity';
                const id = document.createElement('span');
                id.className = 'entity-id';
                id.textContent = `#${entity.getId()}`;
                button.append(name, id);
                button.onclick = event => {
                    const selected = event.shiftKey ? [...Editor.selectedEntities] : [];
                    const index = selected.findIndex(item => item.getId() === entity.getId());
                    if (index >= 0) selected.splice(index, 1);
                    else selected.push(entity);
                    Editor.selectedEntities = selected;
                    this.updateEntitySelectionInList(leftSidebar);
                    this.renderSelection();
                };
                item.append(button);
                fragment.append(item);
            }
            list.append(fragment);
            if (entityIndex < filtered.length) this.entityListRenderFrame = requestAnimationFrame(renderNextBatch);
            else this.entityListRenderFrame = null;
        };
        renderNextBatch();
    };

    private renderSelection = () => {
        this.cancelSelectionRender();
        const list = document.getElementById('inspector-list') as HTMLUListElement | null;
        const status = document.getElementById('selection-status');
        if (!list) return;
        list.replaceChildren();
        const selected = Editor.selectedEntities.filter(entity => !entity.toBeKilled);
        if (status) status.textContent = selected.length ? `${selected.length} selected` : 'No selection';
        if (!selected.length) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = 'Select an entity on the canvas or in the entity list to edit its properties.';
            list.append(empty);
            return;
        }

        let entityIndex = 0;
        const renderToken = this.selectionRenderToken;
        const renderNextBatch = () => {
            if (renderToken !== this.selectionRenderToken) return;
            const fragment = document.createDocumentFragment();
            const batchEnd = Math.min(entityIndex + this.selectionBatchSize, selected.length);
            while (entityIndex < batchEnd)
                fragment.append(this.entityEditor.getEntityListElement(selected[entityIndex++]));
            list.append(fragment);
            if (entityIndex < selected.length) this.selectionRenderFrame = requestAnimationFrame(renderNextBatch);
            else this.selectionRenderFrame = null;
        };
        renderNextBatch();
    };

    private renderActiveSystems = (rightSidebar: HTMLElement) => {
        const list = rightSidebar.querySelector('#active-systems');
        if (!list) return;
        list.replaceChildren();
        const groups = [
            { name: 'Rendering', keys: Object.keys(GameSystems).filter(key => key.startsWith('Render')) },
            {
                name: 'Gameplay',
                keys: Object.keys(GameSystems).filter(key => !key.startsWith('Render') && !key.startsWith('Debug')),
            },
            { name: 'Debug', keys: Object.keys(GameSystems).filter(key => key.startsWith('Debug')) },
        ];
        for (const group of groups) {
            const item = document.createElement('li');
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = `${group.name} (${group.keys.length})`;
            const controls = document.createElement('div');
            controls.className = 'system-group';
            for (const key of group.keys.sort()) {
                const checkbox = createInput(
                    'checkbox',
                    key,
                    Editor.editorSettings.activeSystems[key as keyof typeof GameSystems],
                );
                checkbox.addEventListener('change', () => {
                    Editor.editorSettings.activeSystems[key as keyof typeof GameSystems] = checkbox.checked;
                    saveEditorSettingsToLocalStorage();
                });
                const row = createListItem(key, checkbox);
                row.querySelector('label')?.setAttribute('title', key);
                controls.append(row);
            }
            details.append(summary, controls);
            item.append(details);
            list.append(item);
        }
    };

    private renderLevelSettings = (rightSidebar: HTMLElement) => {
        const gameWidthInput = rightSidebar.querySelector('#map-width') as HTMLInputElement;
        const gameHeightInput = rightSidebar.querySelector('#map-height') as HTMLInputElement;
        const snapGridInput = rightSidebar.querySelector('#snap-grid') as HTMLInputElement;
        const showGridInput = rightSidebar.querySelector('#show-grid') as HTMLInputElement;
        const gridSideInput = rightSidebar.querySelector('#grid-side') as HTMLInputElement;

        if (!gameWidthInput || !gameHeightInput || !snapGridInput || !showGridInput || !gridSideInput) {
            throw new Error('Could not retrieve level settings element(s)');
        }

        gameWidthInput.value = Engine.mapWidth.toString();
        gameHeightInput.value = Engine.mapHeight.toString();
        snapGridInput.checked = Editor.editorSettings.snapToGrid;
        showGridInput.checked = Editor.editorSettings.showGrid;
        gridSideInput.value = Editor.editorSettings.gridSquareSide.toString();

        gameWidthInput.onchange = event => {
            const target = event.target as HTMLInputElement;
            const value = Number(target.value);
            if (!Number.isInteger(value) || value < 1) {
                target.value = String(Engine.mapWidth);
                return;
            }
            Engine.mapWidth = value;
            this.entityEditor.saveLevel();
        };

        gameHeightInput.onchange = event => {
            const target = event.target as HTMLInputElement;
            const value = Number(target.value);
            if (!Number.isInteger(value) || value < 1) {
                target.value = String(Engine.mapHeight);
                return;
            }
            Engine.mapHeight = value;
            this.entityEditor.saveLevel();
        };

        snapGridInput.onchange = () => {
            Editor.editorSettings.snapToGrid = snapGridInput.checked;
            saveEditorSettingsToLocalStorage();
        };
        showGridInput.onchange = () => {
            Editor.editorSettings.showGrid = showGridInput.checked;
            saveEditorSettingsToLocalStorage();
        };

        gridSideInput.onchange = event => {
            const target = event.target as HTMLInputElement;
            const value = Number(target.value);
            if (!Number.isInteger(value) || value < 1) {
                target.value = String(Editor.editorSettings.gridSquareSide);
                return;
            }
            Editor.editorSettings.gridSquareSide = value;
            saveEditorSettingsToLocalStorage();
        };
    };

    private renderLevelManagement(
        rightSidebar: HTMLElement,
        leftSidebar: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        levelManager: LevelManager,
    ) {
        const localStorageLevelsSelect = document.querySelector('#local-storage-levels') as HTMLSelectElement;
        const newLevelButton = document.querySelector('#new-level') as HTMLButtonElement;
        const levelNameInput = rightSidebar.querySelector('#level-name') as HTMLInputElement;
        const deleteLevelButton = document.querySelector('#delete-level') as HTMLButtonElement;
        const exportToJsonButton = rightSidebar.querySelector('#export-to-json') as HTMLButtonElement;
        const loadFromJsonButton = rightSidebar.querySelector('#load-from-json') as HTMLButtonElement;

        if (
            !localStorageLevelsSelect ||
            !newLevelButton ||
            !levelNameInput ||
            !deleteLevelButton ||
            !exportToJsonButton ||
            !loadFromJsonButton
        ) {
            throw new Error('Could not retrieve level management element(s)');
        }

        const levelKeys = getAllLevelKeysFromLocalStorage();
        const options: { value: string; text: string }[] = [];
        for (const key of levelKeys) {
            const level = loadLevelFromLocalStorage(key);
            if (!level) throw new Error('Could not read level from local storage');
            options.push({ value: key, text: getLevelName(key, level) });
        }

        localStorageLevelsSelect.replaceChildren();
        options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.id = optionData.value;
            option.textContent = optionData.text;
            localStorageLevelsSelect.appendChild(option);
        });

        localStorageLevelsSelect.value = Editor.editorSettings.selectedLevel ?? options[0].value;
        const selectedId = localStorageLevelsSelect.value;
        const selectedLevel = loadLevelFromLocalStorage(selectedId);
        if (selectedLevel) levelNameInput.value = getLevelName(selectedId, selectedLevel);

        levelNameInput.onchange = () => {
            const levelId = Editor.editorSettings.selectedLevel;
            if (!levelId) return;
            this.entityEditor.flushSave();
            const level = loadLevelFromLocalStorage(levelId);
            if (!level) throw new Error('Could not read level from local storage');
            const name = resolveLevelName(levelId, levelNameInput.value, levelId);
            if (!name) {
                levelNameInput.value = getLevelName(levelId, level);
                showAlert('A level with this name already exists. Choose another name.');
                return;
            }
            saveLevelToLocalStorage(levelId, { ...level, name });
            levelNameInput.value = name;
            const option = document.getElementById(levelId) as HTMLOptionElement | null;
            if (option) option.textContent = name;
        };

        localStorageLevelsSelect.onchange = async (event: Event): Promise<void> => {
            const target = event.target as HTMLSelectElement;
            const levelId = target.value;

            await this.handleLevelSelect(levelId, levelManager, leftSidebar, rightSidebar);
        };

        newLevelButton.onclick = async () => {
            const levelKeys = getAllLevelKeysFromLocalStorage();
            const nextLevelId = getNextLevelId(levelKeys);
            const requestedName = window.prompt('Level name (optional)', '');
            if (requestedName === null) return;
            const name = resolveLevelName(nextLevelId, requestedName);
            if (!name) {
                showAlert('A level with this name already exists. Choose another name.');
                return;
            }

            const newLevelMap: LevelMap = {
                name,
                textures: [],
                sounds: [],
                mapWidth: 64 * 10,
                mapHeight: 64 * 10,
                entities: [],
            };

            saveLevelToLocalStorage(nextLevelId, newLevelMap);
            const option = document.createElement('option');
            option.value = nextLevelId;
            option.id = nextLevelId;
            option.textContent = name;
            localStorageLevelsSelect.appendChild(option);

            await this.handleLevelSelect(nextLevelId, levelManager, leftSidebar, rightSidebar);
        };

        deleteLevelButton.onclick = async () => {
            if (!Editor.editorSettings.selectedLevel) {
                throw new Error('No level selected');
            }

            const selectedLevel = loadLevelFromLocalStorage(Editor.editorSettings.selectedLevel);
            if (!selectedLevel) throw new Error('Could not read level from local storage');
            if (
                !window.confirm(
                    `Delete level ${getLevelName(Editor.editorSettings.selectedLevel, selectedLevel)}? This cannot be undone.`,
                )
            )
                return;
            this.entityEditor.flushSave();
            deleteLevelFromLocalStorage(Editor.editorSettings.selectedLevel);
            const optionToDelete = document.getElementById(Editor.editorSettings.selectedLevel) as HTMLOptionElement;

            if (!optionToDelete) {
                throw new Error('Could not locate option with id ' + Editor.editorSettings.selectedLevel);
            }

            optionToDelete.remove();

            const levelKeys = getAllLevelKeysFromLocalStorage();

            if (levelKeys.length > 0) {
                await this.handleLevelSelect(levelKeys[0], levelManager, leftSidebar, rightSidebar);
            } else {
                console.log('No level available, loading default empty level');
                const { levelId, levelMap } = levelManager.getDefaultLevel('level-0');
                levelMap.name = levelId;
                saveLevelToLocalStorage(levelId, levelMap);
                const option = document.createElement('option');
                option.value = levelId;
                option.id = levelId;
                option.textContent = levelId;
                localStorageLevelsSelect.appendChild(option);

                await this.handleLevelSelect(levelId, levelManager, leftSidebar, rightSidebar);
            }
        };

        exportToJsonButton.onclick = () => {
            const levelId = Editor.editorSettings.selectedLevel;
            if (!levelId) throw new Error('No level selected');
            this.entityEditor.flushSave();
            saveLevelToJson(levelId, registry, assetStore);
        };
        loadFromJsonButton.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.addEventListener('change', () => {
                const files = input.files;
                if (files && files.length > 0) {
                    const file: File = files[0];

                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const data = JSON.parse(reader.result as string);
                            const levelKeys = getAllLevelKeysFromLocalStorage();
                            const nextLevelId = getNextLevelId(levelKeys);

                            const levelMap = data as LevelMap;

                            if (!isValidLevelMap(levelMap)) {
                                throw new Error('Loaded json is not a valid levelmap: ' + levelMap);
                            }
                            const name = resolveLevelName(nextLevelId, levelMap.name);
                            if (!name) {
                                showAlert(
                                    'A level with this name already exists. Choose another name before importing.',
                                );
                                return;
                            }

                            saveLevelToLocalStorage(nextLevelId, { ...levelMap, name });

                            const option = document.createElement('option');
                            option.value = nextLevelId;
                            option.id = nextLevelId;
                            option.textContent = name;
                            localStorageLevelsSelect.appendChild(option);

                            await this.handleLevelSelect(nextLevelId, levelManager, leftSidebar, rightSidebar);
                        } catch (e) {
                            console.error('Invalid JSON:', e);
                            showAlert('Selected json is not a valid level map');
                        } finally {
                            input.value = '';
                        }
                    };

                    reader.readAsText(file);
                }
            });

            input.click();
        };
    }

    private handleLevelSelect = async (
        levelId: string,
        levelManager: LevelManager,
        leftSidebar: HTMLElement,
        rightSidebar: HTMLElement,
    ) => {
        Editor.loadingLevel = true;
        this.entityEditor.flushSave();
        const level = loadLevelFromLocalStorage(levelId);
        if (!level) {
            throw new Error('Could not read level from local storage');
        }

        await levelManager.loadLevelFromLevelMap(level);
        Editor.selectedEntities = [];
        this.renderEntityList(leftSidebar);
        this.renderSelection();

        const gameWidthInput = rightSidebar.querySelector('#map-width') as HTMLInputElement;
        const gameHeightInput = rightSidebar.querySelector('#map-height') as HTMLInputElement;
        const levelSelect = document.querySelector('#local-storage-levels') as HTMLSelectElement;
        const levelNameInput = rightSidebar.querySelector('#level-name') as HTMLInputElement;

        if (!gameWidthInput || !gameHeightInput || !levelSelect || !levelNameInput) {
            throw new Error('Could not identify sidebar element(s)');
        }

        gameWidthInput.value = level.mapWidth.toString();
        gameHeightInput.value = level.mapHeight.toString();
        levelSelect.value = levelId;
        levelNameInput.value = getLevelName(levelId, level);
        Editor.editorSettings.selectedLevel = levelId;

        saveEditorSettingsToLocalStorage();
        this.entityEditor.saveLevel();

        Editor.loadingLevel = false;
    };
}
