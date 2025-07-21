import Engine from '../../engine/Engine';
import AssetStore from '../../engine/asset-store/AssetStore';
import Entity from '../../engine/ecs/Entity';
import Registry from '../../engine/ecs/Registry';
import System from '../../engine/ecs/System';
import EventBus from '../../engine/event-bus/EventBus';
import LevelManager from '../../engine/level-manager/LevelManager';
import {
    loadLevelFromLocalStorage,
    saveCurrentLevelToLocalStorage,
    saveLevelMapToLocalStorage,
    saveLevelToJson,
} from '../../engine/serialization/persistence';
import { LevelMap } from '../../engine/types/map';
import { isValidLevelMap } from '../../engine/utils/level';
import * as GameComponents from '../../game/components';
import EntityKilledEvent from '../../game/events/EntityKilledEvent';
import * as GameSystems from '../../game/systems';
import Editor from '../Editor';
import EntityDeleteEvent from '../events/EntityDeleteEvent';
import EntityDuplicateEvent from '../events/EntityDuplicateEvent';
import EntitySelectEvent from '../events/EntitySelectEvent';
import { showAlert } from '../gui/alert';
import { createInput, createListItem, getComponentContainer, getComponentsForms } from '../gui/forms';
import {
    deleteLevelInLocalStorage,
    getAllLevelKeysFromLocalStorage,
    getNextLevelId,
    saveEditorSettingsToLocalStorage,
} from '../persistence/persistence';

export default class RenderSidebarSystem extends System {
    constructor() {
        super();
    }

    subscribeToEvents(eventBus: EventBus, leftSidebar: HTMLElement | null, assetStore: AssetStore) {
        eventBus.subscribeToEvent(EntitySelectEvent, this, event => this.onEntitySelect(event, leftSidebar));
        eventBus.subscribeToEvent(EntityDeleteEvent, this, event =>
            this.onEntityDelete(event, leftSidebar, assetStore),
        );
        eventBus.subscribeToEvent(EntityDuplicateEvent, this, event =>
            this.onEntityDuplicate(event, leftSidebar, assetStore, eventBus),
        );
        eventBus.subscribeToEvent(EntityKilledEvent, this, event => this.onEntityKilled(event, leftSidebar));
    }

    onEntitySelect = (event: EntitySelectEvent, leftSidebar: HTMLElement | null) => {
        if (!leftSidebar) {
            throw new Error('Could not retrieve leftSidebar');
        }

        this.scrollToListElement(leftSidebar, `#entity-${event.entity.getId()}`);
    };

    onEntityDelete = (event: EntityDeleteEvent, leftSidebar: HTMLElement | null, assetStore: AssetStore) => {
        if (!leftSidebar) {
            throw new Error('Could not retrieve leftSidebar');
        }

        const entityList = leftSidebar.querySelector('#entity-list');

        if (!entityList) {
            throw new Error('Could not retrieve entity list');
        }

        event.entity.kill();

        const targetElement = entityList.querySelector(`#entity-${event.entity.getId()}`);

        if (!targetElement) {
            throw new Error('Could not find target element in entity list');
        }

        Editor.selectedEntity = null;
        targetElement.remove();
        saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, event.entity.registry, assetStore);
    };

    onEntityDuplicate = (
        event: EntitySelectEvent,
        leftSidebar: HTMLElement | null,
        assetStore: AssetStore,
        eventBus: EventBus,
    ) => {
        if (!leftSidebar) {
            throw new Error('Could not retrieve leftSidebar');
        }

        const entityList = leftSidebar.querySelector('#entity-list');

        if (!entityList) {
            throw new Error('Could not retrieve entity list');
        }

        const originalEntity = event.entity;
        const entityCopy = event.entity.duplicate();

        entityList.appendChild(
            this.getEntityListElement(entityCopy, originalEntity.registry, assetStore, eventBus, leftSidebar),
        );

        eventBus.emitEvent(EntitySelectEvent, entityCopy);
        saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, originalEntity.registry, assetStore);
    };

    onEntityKilled = (event: EntityKilledEvent, leftSidebar: HTMLElement | null) => {
        if (!leftSidebar) {
            throw new Error('Could not retrieve leftSidebar');
        }

        const entityList = leftSidebar.querySelector('#entity-list');

        if (!entityList) {
            throw new Error('Could not retrieve entity list');
        }

        const targetElement = entityList.querySelector(`#entity-${event.entity.getId()}`);

        if (targetElement) {
            if (event.entity.getId() === Editor.selectedEntity) {
                Editor.selectedEntity = null;
            }
            targetElement.remove();
        }
    };

    update(
        leftSidebar: HTMLElement,
        rightSidebar: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        eventBus: EventBus,
        levelManager: LevelManager,
    ) {
        this.renderEntityList(leftSidebar, registry, assetStore, eventBus);
        this.renderActiveSystems(rightSidebar);
        this.renderLevelSettings(rightSidebar);
        this.renderLevelManagement(rightSidebar, leftSidebar, registry, assetStore, eventBus, levelManager);
    }

    private renderEntityList = (
        leftSidebar: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        eventBus: EventBus,
    ) => {
        const entityList = leftSidebar.querySelector('#entity-list');

        if (!entityList) {
            throw new Error('Could not retrieve entity list');
        }

        entityList.innerHTML = '';

        const entities = registry.getAllEntities();

        for (const entity of entities) {
            entityList.appendChild(this.getEntityListElement(entity, registry, assetStore, eventBus, leftSidebar));
        }

        const addEntityButton = leftSidebar.querySelector('#add-entity') as HTMLButtonElement;

        if (!addEntityButton) {
            throw new Error('Could not find add entity button');
        }

        addEntityButton.onclick = () => {
            const entity = registry.createEntity();
            entityList.appendChild(this.getEntityListElement(entity, registry, assetStore, eventBus, leftSidebar));
            eventBus.emitEvent(EntitySelectEvent, entity);
            saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, registry, assetStore);
        };
    };

    private getEntityListElement = (
        entity: Entity,
        registry: Registry,
        assetStore: AssetStore,
        eventBus: EventBus,
        leftSidebar: HTMLElement,
    ) => {
        const entityComponents = entity.getComponents();

        const li = document.createElement('li');
        li.id = `entity-${entity.getId()}`;
        li.style.border = 'solid 1px white';
        li.onclick = () => (Editor.selectedEntity = entity.getId());

        const header = document.createElement('div');
        header.className = 'd-flex align-center space-between';

        const title = document.createElement('h3');
        title.textContent = `Entity id: ${entity.getId()}`;

        const duplicateButton = document.createElement('button');
        duplicateButton.innerText = 'DUPLICATE';
        duplicateButton.onclick = () => {
            eventBus.emitEvent(EntityDuplicateEvent, entity);
        };

        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'DELETE';
        deleteButton.onclick = () => {
            eventBus.emitEvent(EntityDeleteEvent, entity);
        };

        header.append(title);
        header.append(duplicateButton);
        header.append(deleteButton);
        li.appendChild(header);

        const componentSelector = document.createElement('div');
        componentSelector.className = 'd-flex align-center space-between pt-2';

        const addComponentButton = document.createElement('button');
        addComponentButton.innerText = 'ADD COMPONENT';
        addComponentButton.onclick = () => {
            const entityComponentSelector = document.getElementById(
                'component-select-' + entity.getId(),
            ) as HTMLSelectElement;

            if (!entityComponentSelector) {
                throw new Error('Could not find component selector for entity ' + entity.getId());
            }

            const ComponentClass = GameComponents[entityComponentSelector.value as keyof typeof GameComponents];

            if (entity.hasComponent(ComponentClass)) {
                showAlert(`Entity with id ${entity.getId()} already has component ` + entityComponentSelector.value);
            } else {
                entity.addComponent(ComponentClass);

                const component = entity.getComponent(ComponentClass);

                if (!component) {
                    throw new Error('Could not find new component for entity ' + entity.getId());
                }

                // Entities are added to systems only on creation, here we force and update to all systems
                registry.removeEntityFromSystems(entity);
                registry.addEntityToSystems(entity);

                const componentContainer = getComponentContainer(component, entity, assetStore, registry);
                li.appendChild(componentContainer);

                this.scrollToListElement(leftSidebar, `#${component.constructor.name}-${entity.getId()}`);
            }
        };

        const select = document.createElement('select');
        select.id = 'component-select-' + entity.getId();

        const options: { value: string; text: string }[] = [];
        for (const componentKey in GameComponents) {
            options.push({ value: componentKey, text: componentKey });
        }

        options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            select.appendChild(option);
        });

        componentSelector.appendChild(addComponentButton);
        componentSelector.appendChild(select);
        li.appendChild(componentSelector);

        const forms = getComponentsForms(entityComponents, entity, assetStore, registry);
        li.appendChild(forms);

        return li;
    };

    private renderActiveSystems = (rightSidebar: HTMLElement) => {
        const activeSystemsList = rightSidebar.querySelector('#active-systems');

        if (!activeSystemsList) {
            throw new Error('Could not retrieve active systems list');
        }

        for (const systemKey in GameSystems) {
            const checkBoxInput = createInput(
                'checkbox',
                systemKey,
                Editor.editorSettings.activeSystems[systemKey as keyof typeof GameSystems],
            );
            checkBoxInput.addEventListener('input', event => {
                const target = event.target as HTMLInputElement;
                Editor.editorSettings.activeSystems[systemKey as keyof typeof GameSystems] = target.checked;
                saveEditorSettingsToLocalStorage();
            });
            const propertyLi = createListItem(systemKey, checkBoxInput);
            activeSystemsList.appendChild(propertyLi);
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

        gameWidthInput.addEventListener('input', event => {
            const target = event.target as HTMLInputElement;
            Engine.mapWidth = parseInt(target.value);
            saveEditorSettingsToLocalStorage();
        });

        gameHeightInput.addEventListener('input', event => {
            const target = event.target as HTMLInputElement;
            Engine.mapHeight = parseInt(target.value);
            saveEditorSettingsToLocalStorage();
        });

        snapGridInput.addEventListener('input', event => {
            const target = event.target as HTMLInputElement;
            Editor.editorSettings.snapToGrid = target.checked;
            saveEditorSettingsToLocalStorage();
        });

        showGridInput.addEventListener('input', event => {
            const target = event.target as HTMLInputElement;
            Editor.editorSettings.showGrid = target.checked;
            saveEditorSettingsToLocalStorage();
        });

        gridSideInput.addEventListener('input', event => {
            const target = event.target as HTMLInputElement;
            Editor.editorSettings.gridSquareSide = parseInt(target.value);
            saveEditorSettingsToLocalStorage();
        });
    };

    private renderLevelManagement(
        rightSidebar: HTMLElement,
        leftSidebar: HTMLElement,
        registry: Registry,
        assetStore: AssetStore,
        eventBus: EventBus,
        levelManager: LevelManager,
    ) {
        const localStorageLevelsSelect = rightSidebar.querySelector('#local-storage-levels') as HTMLSelectElement;
        const newLevelButton = rightSidebar.querySelector('#new-level') as HTMLButtonElement;
        const deleteLevelButton = rightSidebar.querySelector('#delete-level') as HTMLButtonElement;
        const saveToJsonButton = rightSidebar.querySelector('#save-to-json') as HTMLButtonElement;
        const loadFromJsonButton = rightSidebar.querySelector('#load-from-json') as HTMLButtonElement;
        const fileInput = document.getElementById('file-input') as HTMLInputElement;

        if (
            !localStorageLevelsSelect ||
            !newLevelButton ||
            !deleteLevelButton ||
            !saveToJsonButton ||
            !loadFromJsonButton ||
            !fileInput
        ) {
            throw new Error('Could not retrieve level management element(s)');
        }

        const levelKeys = getAllLevelKeysFromLocalStorage();
        const options: { value: string; text: string }[] = [];
        for (const key of levelKeys) {
            options.push({ value: key, text: key });
        }

        options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.id = optionData.value;
            option.textContent = optionData.text;
            localStorageLevelsSelect.appendChild(option);
        });

        localStorageLevelsSelect.value = Editor.editorSettings.selectedLevel ?? options[0].value;

        localStorageLevelsSelect.addEventListener('change', async (event: Event): Promise<void> => {
            const target = event.target as HTMLSelectElement;
            const levelId = target.value;
            registry.clear();
            await levelManager.loadLevelFromLocalStorage(registry, levelId);

            this.renderEntityList(leftSidebar, registry, assetStore, eventBus);
            const gameWidthInput = rightSidebar.querySelector('#map-width') as HTMLInputElement;
            const gameHeightInput = rightSidebar.querySelector('#map-height') as HTMLInputElement;

            if (!gameWidthInput || !gameHeightInput) {
                throw new Error('Could not identify sidebar element(s)');
            }

            const level = loadLevelFromLocalStorage(levelId);
            if (!level) {
                throw new Error('Could not read level from local storage');
            }
            gameWidthInput.value = level.mapWidth.toString();
            gameHeightInput.value = level.mapHeight.toString();

            this.handleLevelSelect(levelId, localStorageLevelsSelect);
        });

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

            saveLevelMapToLocalStorage(nextLevelId, newLevelMap);
            const option = document.createElement('option');
            option.value = nextLevelId;
            option.id = nextLevelId;
            option.textContent = nextLevelId;
            localStorageLevelsSelect.appendChild(option);

            localStorageLevelsSelect.value = nextLevelId;
            registry.clear();
            await levelManager.loadLevelFromLocalStorage(registry, nextLevelId);

            const entityList = leftSidebar.querySelector('#entity-list');
            const gameWidthInput = rightSidebar.querySelector('#map-width') as HTMLInputElement;
            const gameHeightInput = rightSidebar.querySelector('#map-height') as HTMLInputElement;

            if (!entityList || !gameWidthInput || !gameHeightInput) {
                throw new Error('Could not identify sidebar element(s)');
            }

            entityList.innerHTML = '';
            gameWidthInput.value = newLevelMap.mapWidth.toString();
            gameHeightInput.value = newLevelMap.mapHeight.toString();

            this.handleLevelSelect(nextLevelId, localStorageLevelsSelect);
        };

        deleteLevelButton.onclick = async () => {
            // TODO: add confirmation for deletion of level
            if (!Editor.editorSettings.selectedLevel) {
                throw new Error('No level selected');
            }

            deleteLevelInLocalStorage(Editor.editorSettings.selectedLevel);
            const optionToDelete = rightSidebar.querySelector(
                '#' + Editor.editorSettings.selectedLevel,
            ) as HTMLSelectElement;

            if (!optionToDelete) {
                throw new Error('Could not locate option with id ' + Editor.editorSettings.selectedLevel);
            }

            optionToDelete.remove();

            const levelKeys = getAllLevelKeysFromLocalStorage();

            if (levelKeys.length > 0) {
                await levelManager.loadLevelFromLocalStorage(registry, levelKeys[0]);
                this.handleLevelSelect(levelKeys[0], localStorageLevelsSelect);
            } else {
                // TODO: extract this in a reusable method
                console.log('No level available, loading default empty level');
                const defaultLevelId = 'level-0';
                const newLevelMap: LevelMap = {
                    textures: [],
                    sounds: [],
                    mapWidth: 64 * 10,
                    mapHeight: 64 * 10,
                    entities: [],
                };

                saveLevelMapToLocalStorage(defaultLevelId, newLevelMap);
                const option = document.createElement('option');
                option.value = defaultLevelId;
                option.id = defaultLevelId;
                option.textContent = defaultLevelId;
                localStorageLevelsSelect.appendChild(option);

                await levelManager.loadLevelFromLocalStorage(registry, defaultLevelId);
                this.handleLevelSelect(defaultLevelId, localStorageLevelsSelect);
            }
        };

        saveToJsonButton.onclick = () => saveLevelToJson(registry, assetStore);
        loadFromJsonButton.onclick = () => {
            fileInput.click();
        };

        fileInput.addEventListener('change', () => {
            const files = fileInput.files;
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

                        saveLevelMapToLocalStorage(nextLevelId, levelMap);

                        const option = document.createElement('option');
                        option.value = nextLevelId;
                        option.textContent = nextLevelId;
                        localStorageLevelsSelect.appendChild(option);

                        registry.clear();
                        await levelManager.loadLevelFromLocalStorage(registry, nextLevelId);
                        this.handleLevelSelect(nextLevelId, localStorageLevelsSelect);
                    } catch (e) {
                        console.error('Invalid JSON:', e);
                        showAlert('Selected json is not a valid level map');
                    } finally {
                        fileInput.value = '';
                    }
                };

                reader.readAsText(file);
            }
        });
    }

    private handleLevelSelect = (levelId: string, levelSelectElement: HTMLSelectElement) => {
        Editor.editorSettings.selectedLevel = levelId;
        levelSelectElement.value = levelId;
        saveEditorSettingsToLocalStorage();
    };

    private scrollToListElement = (sidebar: HTMLElement, elementId: string) => {
        const entityList = sidebar.querySelector('#entity-list');

        if (!entityList) {
            throw new Error('Could not retrieve entity list');
        }

        const targetElement = entityList.querySelector(elementId);

        if (!targetElement) {
            throw new Error('Could not find target element in entity list');
        }

        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };
}
