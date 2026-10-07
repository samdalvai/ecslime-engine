import {
    AssetStore,
    Component,
    Entity,
    EntityMap,
    EventBus,
    LevelManager,
    Rectangle,
    Registry,
    Vector,
    isValidEntityMap,
} from 'ecslime-engine';

import * as GameComponents from '../../game/components';
import Editor from '../Editor';
import EntityDeleteEvent from '../events/EntityDeleteEvent';
import EntityDuplicateEvent from '../events/EntityDuplicateEvent';
import EntityPasteEvent from '../events/EntityPasteEvent';
import EntitySelectEvent from '../events/EntitySelectEvent';
import EntityUpdateEvent from '../events/EntityUpdateEvent';
import { createInput, createListItem, scrollToListElement, showAlert } from '../gui';
import { saveCurrentLevelToLocalStorage } from '../persistence/levelPersistence';
import VersionManager from '../version-manager/VersionManager';

export default class EntityEditor {
    private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private registry: Registry;
    private assetStore: AssetStore;
    private eventBus: EventBus;
    private levelManager: LevelManager;
    private versionManager: VersionManager;

    private levelChangeLock: boolean;

    constructor(
        registry: Registry,
        assetStore: AssetStore,
        eventBus: EventBus,
        levelManager: LevelManager,
        versionManager: VersionManager,
    ) {
        this.registry = registry;
        this.assetStore = assetStore;
        this.eventBus = eventBus;
        this.levelManager = levelManager;
        this.versionManager = versionManager;

        this.levelChangeLock = false;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Level management
    ////////////////////////////////////////////////////////////////////////////////

    public saveLevel = () => {
        const status = document.getElementById('save-status');
        if (status) status.textContent = 'Saving…';
        if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(() => this.flushSave(), 300);
    };

    public flushSave = () => {
        if (!this.saveDebounceTimer) return;
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
        const levelId = Editor.editorSettings.selectedLevel;
        if (!levelId) return;
        const levelMap = saveCurrentLevelToLocalStorage(levelId, this.registry, this.assetStore);
        this.versionManager.addLevelVersion(levelId, levelMap);
        const status = document.getElementById('save-status');
        if (status) status.textContent = 'Saved locally';
    };

    public undoLevelChange = async () => {
        this.flushSave();
        if (this.levelChangeLock) {
            return;
        }

        if (Editor.editorSettings.selectedLevel) {
            if (this.versionManager.isOldestVersion(Editor.editorSettings.selectedLevel)) {
                return;
            }

            this.levelChangeLock = true;
            this.versionManager.setPreviousLevelVersion(Editor.editorSettings.selectedLevel);
            const levelVersion = this.versionManager.getCurrentLevelVersion(Editor.editorSettings.selectedLevel);
            await this.levelManager.loadLevelFromLevelMap(levelVersion);
            this.eventBus.emitEvent(EntityUpdateEvent);
            saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, this.registry, this.assetStore);
            this.levelChangeLock = false;
        }
    };

    public redoLevelChange = async () => {
        this.flushSave();
        if (this.levelChangeLock) {
            return;
        }

        if (Editor.editorSettings.selectedLevel) {
            if (this.versionManager.isLatestVersion(Editor.editorSettings.selectedLevel)) {
                return;
            }

            this.levelChangeLock = true;
            this.versionManager.setNextLevelVersion(Editor.editorSettings.selectedLevel);
            const levelVersion = this.versionManager.getCurrentLevelVersion(Editor.editorSettings.selectedLevel);
            await this.levelManager.loadLevelFromLevelMap(levelVersion);
            this.eventBus.emitEvent(EntityUpdateEvent);
            saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, this.registry, this.assetStore);
            this.levelChangeLock = false;
        }
    };

    public resetLevelChanges = async () => {
        if (this.levelChangeLock) {
            return;
        }

        if (Editor.editorSettings.selectedLevel) {
            this.levelChangeLock = true;
            const levelVersion = this.versionManager.getCurrentLevelVersion(Editor.editorSettings.selectedLevel);
            await this.levelManager.loadLevelFromLevelMap(levelVersion);
            this.eventBus.emitEvent(EntityUpdateEvent);
            saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, this.registry, this.assetStore);
            this.levelChangeLock = false;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Entity management
    ////////////////////////////////////////////////////////////////////////////////

    addEntity = () => {
        const entity = this.registry.createEntity();
        entity.addComponent(GameComponents.TransformComponent);

        Editor.selectedEntities = [entity];
        this.eventBus.emitEvent(EntitySelectEvent, [entity]);
        this.saveLevel();
    };

    removeEntity = (entity: Entity) => {
        entity.kill();
        this.saveLevel();
    };

    importEntities = () => {
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

                        const entitiesMap = data as EntityMap[];

                        for (const entityMap of entitiesMap) {
                            if (!isValidEntityMap(entityMap)) {
                                throw new Error('Loaded json is not a valid entity map: ' + entityMap);
                            }
                        }

                        this.eventBus.emitEvent(EntityPasteEvent, entitiesMap);
                    } catch (e) {
                        console.error('Invalid JSON:', e);
                        showAlert('Selected json is not a valid entity map');
                    } finally {
                        input.value = '';
                    }
                };

                reader.readAsText(file);
            }
        });

        input.click();
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Component management
    ////////////////////////////////////////////////////////////////////////////////

    addComponent = (entity: Entity, componentList: HTMLLIElement) => {
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
            const component = entity.addComponent(ComponentClass);
            const componentContainer = this.getComponentContainer(component, entity);
            componentContainer.open = true;
            componentList.appendChild(componentContainer);

            scrollToListElement('#inspector-list', `#${component.constructor.name}-${entity.getId()}`);
        }

        this.saveLevel();
    };

    removeComponent = (component: Component, entity: Entity, containerId: string) => {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Component container not found: ${containerId}`);
        container.remove();

        const ComponentClass = GameComponents[component.constructor.name as keyof typeof GameComponents];
        if (!ComponentClass) throw new Error(`Component class not found: ${component.constructor.name}`);

        entity.removeComponent(ComponentClass);
    };

    ////////////////////////////////////////////////////////////////////////////////
    // HMTL elements management
    ////////////////////////////////////////////////////////////////////////////////

    getEntityListElement = (entity: Entity) => {
        const entityComponents = entity.getComponents();

        const componentList = document.createElement('li');
        componentList.id = `entity-${entity.getId()}`;
        componentList.className = 'inspector-entity';

        const header = document.createElement('div');
        header.className = 'inspector-entity-header';

        const title = document.createElement('h3');
        title.textContent = entity.getTag() || `Entity #${entity.getId()}`;

        const duplicateButton = document.createElement('button');
        duplicateButton.innerText = 'Duplicate';
        duplicateButton.onclick = () => {
            this.eventBus.emitEvent(EntityDuplicateEvent, entity);
        };

        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.className = 'danger-quiet';
        deleteButton.onclick = () => this.eventBus.emitEvent(EntityDeleteEvent, entity);

        header.append(title);
        header.append(duplicateButton);
        header.append(deleteButton);
        componentList.appendChild(header);

        const entityTagInput = createInput('text', entity.getId() + '-tag', entity.getTag() ?? '');
        entityTagInput.addEventListener('input', e => {
            const input = e.target as HTMLInputElement;
            const value = input.value.trim();
            const previousTag = entity.getTag();
            entity.removeTag();
            try {
                if (value) entity.tag(value);
            } catch {
                if (previousTag) entity.tag(previousTag);
                input.value = previousTag ?? '';
                showAlert('This tag is already used by another entity.');
                return;
            }
            this.saveLevel();
            title.textContent = value || `Entity #${entity.getId()}`;
            document.dispatchEvent(new Event('editor:entity-changed'));
        });
        const entityTagListItem = createListItem('Entity tag', entityTagInput);

        const entityGroupInput = createInput('text', entity.getId() + '-group', entity.getGroup() ?? '');
        entityGroupInput.addEventListener('input', e => {
            const value = (e.target as HTMLInputElement).value;
            entity.removeGroup();

            if (value !== '') {
                entity.group(value);
            }

            this.saveLevel();
            document.dispatchEvent(new Event('editor:entity-changed'));
        });
        const entityGroupListItem = createListItem('Entity group', entityGroupInput);

        componentList.append(entityTagListItem);
        componentList.append(entityGroupListItem);

        // const exportToJsonButton = document.createElement('button');
        // exportToJsonButton.innerText = 'Export to json';
        // exportToJsonButton.onclick = () => saveEntityToJson(entity);
        // componentList.append(exportToJsonButton);

        const componentSelector = document.createElement('div');
        componentSelector.className = 'component-picker';

        const addComponentButton = document.createElement('button');
        addComponentButton.innerText = '+ Add component';
        addComponentButton.onclick = () => this.addComponent(entity, componentList);

        const select = document.createElement('select');
        select.id = 'component-select-' + entity.getId();

        const componentKeyKeyList: string[] = [];
        for (const componentKey in GameComponents) {
            componentKeyKeyList.push(componentKey);
        }

        componentKeyKeyList.sort((keyA, keyB) => keyA.localeCompare(keyB));

        const options: { value: string; text: string }[] = [];
        for (const componentKey of componentKeyKeyList) {
            options.push({ value: componentKey, text: componentKey });
        }

        options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            select.appendChild(option);
        });

        const componentSearchLabel = document.createElement('label');
        componentSearchLabel.textContent = 'Add component';
        componentSearchLabel.htmlFor = `component-search-${entity.getId()}`;
        const componentSearch = document.createElement('input');
        componentSearch.id = `component-search-${entity.getId()}`;
        componentSearch.type = 'search';
        componentSearch.placeholder = 'Find a component';
        componentSearch.setAttribute('aria-label', 'Find a component');
        componentSearch.addEventListener('input', () => {
            const query = componentSearch.value.trim().toLowerCase();
            const first = Array.from(select.options).find(option => option.textContent?.toLowerCase().includes(query));
            for (const option of Array.from(select.options))
                option.hidden = !option.textContent?.toLowerCase().includes(query);
            if (first) select.value = first.value;
            addComponentButton.disabled = !first;
        });
        select.setAttribute('aria-label', 'Component to add');
        componentSelector.append(componentSearchLabel, componentSearch, select, addComponentButton);
        componentList.appendChild(componentSelector);

        const forms = this.getComponentsForms(entityComponents, entity);
        componentList.appendChild(forms);

        return componentList;
    };

    private getComponentsForms = (entityComponents: Component[], entity: Entity): HTMLElement => {
        const container = document.createElement('div');
        container.className = 'pt-2';

        const sortedComponents: Component[] = [];
        for (const componentKey of entityComponents) {
            sortedComponents.push(componentKey);
        }

        // Sort components by keeping sprite component at the top
        sortedComponents.sort((componentA, componentB) => {
            if (componentA.constructor.name === 'SpriteComponent') return -1;
            if (componentB.constructor.name === 'SpriteComponent') return 1;

            return componentA.constructor.name.localeCompare(componentB.constructor.name);
        });

        for (const component of sortedComponents) {
            const componentContainer = this.getComponentContainer(component, entity);
            container.append(componentContainer);
        }

        return container;
    };

    private getComponentContainer = (component: Component, entity: Entity) => {
        const componentContainer = document.createElement('details');
        componentContainer.className = 'component-card';
        componentContainer.id = component.constructor.name + '-' + entity.getId();
        componentContainer.open =
            component.constructor.name === 'TransformComponent' || component.constructor.name === 'SpriteComponent';
        const summary = document.createElement('summary');
        summary.textContent = component.constructor.name.replace(/Component$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
        componentContainer.append(summary);
        if (component.constructor.name !== 'TransformComponent') {
            const actions = document.createElement('div');
            actions.className = 'component-actions';
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.innerText = 'Remove component';
            removeButton.onclick = () => {
                this.removeComponent(component, entity, componentContainer.id);
                this.saveLevel();
            };
            actions.append(removeButton);
            componentContainer.append(actions);
        }
        const properties = Object.keys(component);
        for (const key of properties) {
            const form = this.getPropertyInput(key, (component as any)[key], component, entity.getId());
            if (form) componentContainer.append(form);
        }
        if (!properties.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No editable properties.';
            componentContainer.append(empty);
        }
        return componentContainer;
    };

    private getPropertyInput = (
        propertyName: string,
        propertyValue: string | number | boolean | Vector | Rectangle,
        component: Component,
        entityId: number,
    ) => {
        if (propertyValue === null) {
            return null;
        }

        if (component.constructor.name === 'SpriteComponent' && propertyName === 'assetId') {
            return this.createSpriteSelector(propertyName, component, entityId);
        }

        if (Array.isArray(propertyValue)) {
            const arrayContainer = document.createElement('div');
            for (const property of propertyValue as Array<any>) {
                arrayContainer.append(this.createListItemWithInput(propertyName, property, component, entityId));
            }

            return arrayContainer;
        }

        const propertyLabel =
            component.constructor.name === 'TransformComponent' && propertyName === 'position'
                ? 'position (centre, Y-up)'
                : propertyName;

        return this.createListItemWithInputRec(
            propertyName,
            propertyLabel,
            propertyName,
            propertyValue,
            component,
            entityId,
            [],
        );
    };

    private createSpriteSelector = (propertyName: string, component: Component, entityId: number): HTMLElement => {
        const container = document.createElement('div');
        container.className = 'd-flex flex-col';

        const select = document.createElement('select');
        select.id = `${propertyName}-${entityId}`;

        this.assetStore
            .getAllTexturesIds()
            .sort((keyA, keyB) => keyA.localeCompare(keyB))
            .forEach(textureId => {
                const option = document.createElement('option');
                option.value = textureId;
                option.textContent = textureId || 'Unknown';
                select.appendChild(option);
            });

        select.value = (component as any)[propertyName];
        select.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLSelectElement;
            (component as any)[propertyName] = target.value;

            const img = document.getElementById(`spritesheet-${entityId}`) as HTMLImageElement;
            if (!img) throw new Error(`Sprite image not found: ${entityId}`);

            const newAssetImg = this.assetStore.getTexture((component as GameComponents.SpriteComponent).assetId);
            img.src = newAssetImg.src;
            img.style.maxHeight = `${Math.max(newAssetImg.height, 100)}px`;

            this.saveLevel();
        });

        const propertyLi = createListItem(propertyName, select);

        const spriteImage = document.createElement('img');
        const assetImg = this.assetStore.getTexture((component as GameComponents.SpriteComponent).assetId);
        spriteImage.src = assetImg.src;
        spriteImage.style.objectFit = 'contain';
        spriteImage.style.maxHeight = `${assetImg.height}px`;
        spriteImage.style.maxWidth = '100%';
        spriteImage.id = `spritesheet-${entityId}`;

        const spritePicker = document.createElement('button');
        spritePicker.style.marginTop = '10px';
        spritePicker.innerText = 'Load sprite';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async () => {
            const files = fileInput.files;
            if (files && files.length > 0) {
                const file: File = files[0];
                const fileName = file.name;
                const assetId = fileName.replace('.png', '');

                try {
                    await this.assetStore.addTexture(assetId, 'assets/sprites/' + fileName);
                } catch (error) {
                    try {
                        await this.assetStore.addTexture(assetId, 'assets/tilemaps/' + fileName);
                    } catch (error) {
                        showAlert(
                            'Could not load file with name ' +
                                fileName +
                                ' from assets, the sprite mus be under dist/assets/sprites or dist/assets/tilemaps',
                        );
                        return;
                    }
                }

                const allEntities = this.registry.getAllEntities();

                for (const entity of allEntities) {
                    if (entity.hasComponent(GameComponents.SpriteComponent)) {
                        const entitySpriteSelect = document.getElementById('assetId-' + entity.getId());
                        if (!entitySpriteSelect) {
                            continue;
                        }

                        const option = document.createElement('option');
                        option.textContent = assetId;
                        option.value = assetId;
                        entitySpriteSelect.appendChild(option);
                    }
                }
                select.value = assetId;

                const newAssetImg = this.assetStore.getTexture(assetId);
                spriteImage.src = newAssetImg.src;
                spriteImage.style.objectFit = 'contain';
                spriteImage.style.maxHeight = `${newAssetImg.height}px`;
                spriteImage.style.maxWidth = '100%';
                (component as GameComponents.SpriteComponent).assetId = assetId;

                this.saveLevel();
            }
        });

        spritePicker.append(fileInput);
        spritePicker.onclick = () => fileInput.click();

        container.append(propertyLi, spriteImage);
        container.append(spritePicker);
        return container;
    };

    private createListItemWithInput = (
        propertyName: string,
        propertyValue: string | number | boolean | object,
        component: Component,
        entityId: number,
    ) => {
        const enumMeta = (component.constructor as any)._enums?.[propertyName];
        const enumValues = [];

        if (enumMeta) {
            for (const key of Object.keys(enumMeta)) {
                enumValues.push(enumMeta[key]);
            }
        }

        return this.createListItemWithInputRec(
            propertyName,
            propertyName,
            propertyName,
            propertyValue,
            component,
            entityId,
            enumValues,
        );
    };

    private createListItemWithInputRec = (
        id: string,
        label: string,
        propertyName: string,
        propertyValue: string | number | boolean | object,
        component: Component,
        entityId: number,
        enumValues: string[],
    ) => {
        if (enumValues && enumValues.length > 0) {
            const select = document.createElement('select');
            select.id = `${propertyName}-${entityId}`;

            for (const value of enumValues) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value || 'Unknown';
                select.appendChild(option);
            }

            select.value = (component as any)[propertyName];
            select.className = 'flex-1';

            select.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                (component as any)[propertyName] = target.value;
                this.saveLevel();
            });

            return createListItem(label, select);
        }

        const updateProperty = (newValue: any) => {
            (component as any)[propertyName] = newValue;
            this.saveLevel();
        };

        switch (typeof propertyValue) {
            case 'string': {
                const input = createInput('text', `${id}-${propertyName}-${entityId}`, propertyValue);
                input.addEventListener('input', e => updateProperty((e.target as HTMLInputElement).value));
                return createListItem(label, input);
            }
            case 'number': {
                const input = createInput('number', `${id}-${propertyName}-${entityId}`, propertyValue);
                input.addEventListener('input', e => updateProperty(parseFloat((e.target as HTMLInputElement).value)));
                return createListItem(label, input);
            }
            case 'boolean': {
                const input = createInput('checkbox', `${id}-${propertyName}-${entityId}`, propertyValue);
                input.addEventListener('input', e => updateProperty((e.target as HTMLInputElement).checked));
                return createListItem(label, input);
            }
            case 'object': {
                const container = document.createElement('div');

                for (const property in propertyValue) {
                    container.append(
                        this.createListItemWithInputRec(
                            id,
                            `${label}-${property}`,
                            property,
                            propertyValue[property as keyof typeof propertyValue],
                            propertyValue,
                            entityId,
                            enumValues,
                        ),
                    );
                }

                return container;
            }
            default:
                throw new Error(
                    `Uknown type of property ${propertyName} with value ${propertyValue} for component ${component.constructor.name}`,
                );
        }
    };
}
