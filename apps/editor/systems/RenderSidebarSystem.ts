import {
    AssetStore,
    Engine,
    Entity,
    EventBus,
    LevelManager,
    LevelMap,
    Registry,
    System,
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

export default class RenderSidebarSystem extends System {
    private entityEditor: EntityEditor;
    private registry: Registry | null = null;
    private leftSidebar: HTMLElement | null = null;
    private entityChangedListenerBound = false;

    constructor(entityEditor: EntityEditor) {
        super();
        this.entityEditor = entityEditor;
    }

    subscribeToEvents(eventBus: EventBus, registry: Registry, leftSidebar: HTMLElement) {
        eventBus.subscribeToEvent(EntitySelectEvent, this, event => this.onEntitySelect(event, leftSidebar));
        eventBus.subscribeToEvent(EntityDeleteEvent, this, event => this.onEntityDelete(event, leftSidebar));
        eventBus.subscribeToEvent(EntityDuplicateEvent, this, event => this.onEntityDuplicate(event, leftSidebar, eventBus));
        eventBus.subscribeToEvent(EntityPasteEvent, this, event => this.onEntityPaste(event, leftSidebar, eventBus, registry));
        eventBus.subscribeToEvent(EntityKilledEvent, this, () => this.onEntityKilled());
        eventBus.subscribeToEvent(EntityUpdateEvent, this, () => {
            Editor.selectedEntities = [];
            this.renderEntityList(leftSidebar);
            this.renderSelection();
        });
    }

    onEntitySelect = (event: EntitySelectEvent, leftSidebar: HTMLElement) => {
        Editor.selectedEntities = event.entities;
        this.renderEntityList(leftSidebar);
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

    update(leftSidebar: HTMLElement, rightSidebar: HTMLElement, registry: Registry, assetStore: AssetStore, levelManager: LevelManager) {
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
        const filtered = entities.filter(entity => `${entity.getTag() ?? ''} ${entity.getGroup() ?? ''} ${entity.getId()}`.toLowerCase().includes(query));
        list.replaceChildren();
        const fragment = document.createDocumentFragment();
        for (const entity of filtered) {
            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'entity-row';
            button.dataset.entityId = String(entity.getId());
            button.setAttribute('aria-pressed', String(Editor.selectedEntities.some(selected => selected.getId() === entity.getId())));
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
                this.renderEntityList(leftSidebar);
                this.renderSelection();
                leftSidebar.querySelector<HTMLButtonElement>(`.entity-row[data-entity-id="${entity.getId()}"]`)?.focus();
            };
            item.append(button);
            fragment.append(item);
        }
        if (!filtered.length) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = query ? 'No entities match your search.' : 'No entities yet. Add one to start.';
            fragment.append(empty);
        }
        list.append(fragment);
        count.textContent = `${filtered.length} of ${entities.length} entities`;
        exportButton.disabled = Editor.selectedEntities.length === 0;
    };

    private renderSelection = () => {
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
        const fragment = document.createDocumentFragment();
        for (const entity of selected) fragment.append(this.entityEditor.getEntityListElement(entity));
        list.append(fragment);
    };

    private renderActiveSystems = (rightSidebar: HTMLElement) => {
        const list = rightSidebar.querySelector('#active-systems');
        if (!list) return;
        list.replaceChildren();
        const groups = [
            { name: 'Rendering', keys: Object.keys(GameSystems).filter(key => key.startsWith('Render')) },
            { name: 'Gameplay', keys: Object.keys(GameSystems).filter(key => !key.startsWith('Render') && !key.startsWith('Debug')) },
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
                const checkbox = createInput('checkbox', key, Editor.editorSettings.activeSystems[key as keyof typeof GameSystems]);
                checkbox.addEventListener('change', () => {
                    Editor.editorSettings.activeSystems[key as keyof typeof GameSystems] = checkbox.checked;
                    saveEditorSettingsToLocalStorage();
                });
                controls.append(createListItem(key, checkbox));
            }
            details.append(summary, controls);
            item.append(details);
            list.append(item);
        }
    };

    private renderLevelSettings = (rightSidebar: HTMLElement) => {
        const gameWidthInput = rightSidebar.querySelector('#map-width') as HTMLInputElement;
        const gameHeightInput = rightSidebar.querySelector('#map-height') as HTMLInputElement;
        const snapGridInput = document.querySelector('#snap-grid') as HTMLInputElement;
        const showGridInput = document.querySelector('#show-grid') as HTMLInputElement;
        const gridSideInput = rightSidebar.querySelector('#grid-side') as HTMLInputElement;
        const snapGridSetting = rightSidebar.querySelector('#snap-grid-setting') as HTMLInputElement;
        const showGridSetting = rightSidebar.querySelector('#show-grid-setting') as HTMLInputElement;

        if (!gameWidthInput || !gameHeightInput || !snapGridInput || !showGridInput || !gridSideInput || !snapGridSetting || !showGridSetting) {
            throw new Error('Could not retrieve level settings element(s)');
        }

        gameWidthInput.value = Engine.mapWidth.toString();
        gameHeightInput.value = Engine.mapHeight.toString();
        snapGridInput.checked = snapGridSetting.checked = Editor.editorSettings.snapToGrid;
        showGridInput.checked = showGridSetting.checked = Editor.editorSettings.showGrid;
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

        const setSnap = (checked: boolean) => {
            Editor.editorSettings.snapToGrid = checked;
            snapGridInput.checked = snapGridSetting.checked = checked;
            saveEditorSettingsToLocalStorage();
        };
        const setGrid = (checked: boolean) => {
            Editor.editorSettings.showGrid = checked;
            showGridInput.checked = showGridSetting.checked = checked;
            saveEditorSettingsToLocalStorage();
        };
        snapGridInput.onchange = () => setSnap(snapGridInput.checked);
        snapGridSetting.onchange = () => setSnap(snapGridSetting.checked);
        showGridInput.onchange = () => setGrid(showGridInput.checked);
        showGridSetting.onchange = () => setGrid(showGridSetting.checked);

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
        const deleteLevelButton = document.querySelector('#delete-level') as HTMLButtonElement;
        const exportToJsonButton = rightSidebar.querySelector('#export-to-json') as HTMLButtonElement;
        const loadFromJsonButton = rightSidebar.querySelector('#load-from-json') as HTMLButtonElement;

        if (
            !localStorageLevelsSelect ||
            !newLevelButton ||
            !deleteLevelButton ||
            !exportToJsonButton ||
            !loadFromJsonButton
        ) {
            throw new Error('Could not retrieve level management element(s)');
        }

        const levelKeys = getAllLevelKeysFromLocalStorage();
        const options: { value: string; text: string }[] = [];
        for (const key of levelKeys) {
            options.push({ value: key, text: key });
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

        localStorageLevelsSelect.onchange = async (event: Event): Promise<void> => {
            const target = event.target as HTMLSelectElement;
            const levelId = target.value;

            await this.handleLevelSelect(levelId, levelManager, leftSidebar, rightSidebar);
        };

        newLevelButton.onclick = async () => {
            const levelKeys = getAllLevelKeysFromLocalStorage();
            const nextLevelId = getNextLevelId(levelKeys);

            const newLevelMap: LevelMap = {
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
            option.textContent = nextLevelId;
            localStorageLevelsSelect.appendChild(option);

            await this.handleLevelSelect(nextLevelId, levelManager, leftSidebar, rightSidebar);
        };

        deleteLevelButton.onclick = async () => {
            if (!Editor.editorSettings.selectedLevel) {
                throw new Error('No level selected');
            }

            if (!window.confirm(`Delete level ${Editor.editorSettings.selectedLevel}? This cannot be undone.`)) return;
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
                saveLevelToLocalStorage(levelId, levelMap);
                const option = document.createElement('option');
                option.value = levelId;
                option.id = levelId;
                option.textContent = levelId;
                localStorageLevelsSelect.appendChild(option);

                await this.handleLevelSelect(levelId, levelManager, leftSidebar, rightSidebar);
            }
        };

        exportToJsonButton.onclick = () => saveLevelToJson(registry, assetStore);
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

                            saveLevelToLocalStorage(nextLevelId, levelMap);

                            const option = document.createElement('option');
                            option.value = nextLevelId;
                            option.id = nextLevelId;
                            option.textContent = nextLevelId;
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

        if (!gameWidthInput || !gameHeightInput || !levelSelect) {
            throw new Error('Could not identify sidebar element(s)');
        }

        gameWidthInput.value = level.mapWidth.toString();
        gameHeightInput.value = level.mapHeight.toString();
        levelSelect.value = levelId;
        Editor.editorSettings.selectedLevel = levelId;

        saveEditorSettingsToLocalStorage();
        this.entityEditor.saveLevel();

        Editor.loadingLevel = false;
    };
}
