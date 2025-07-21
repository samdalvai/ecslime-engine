import AssetStore from '../../engine/asset-store/AssetStore';
import Component from '../../engine/ecs/Component';
import Entity from '../../engine/ecs/Entity';
import Registry from '../../engine/ecs/Registry';
import { saveCurrentLevelToLocalStorage } from '../../engine/serialization/persistence';
import { Rectangle, Vector } from '../../engine/types/utils';
import * as GameComponents from '../../game/components';
import Editor from '../Editor';

export const getComponentsForms = (
    entityComponents: Component[],
    entity: Entity,
    assetStore: AssetStore,
    registry: Registry,
): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'pt-2';

    for (const component of entityComponents) {
        const componentContainer = getComponentContainer(component, entity, assetStore, registry);
        container.append(componentContainer);
    }

    return container;
};

export const getComponentContainer = (
    component: Component,
    entity: Entity,
    assetStore: AssetStore,
    registry: Registry,
) => {
    const componentContainer = document.createElement('div');
    componentContainer.className = 'pb-2';
    componentContainer.id = component.constructor.name + '-' + entity.getId();

    const componentHeader = document.createElement('div');
    componentHeader.className = 'd-flex space-between align-center';

    const title = document.createElement('span');
    const componentName = component.constructor.name;
    title.innerText = '* ' + componentName;
    title.style.textDecoration = 'underline';

    const removeButton = document.createElement('button');
    removeButton.innerText = 'REMOVE';
    removeButton.onclick = () => {
        const componentContainerToDelete = document.getElementById(component.constructor.name + '-' + entity.getId());

        if (!componentContainerToDelete) {
            throw new Error(
                'Could not find component container to delete with id ' +
                    (component.constructor.name + '-' + entity.getId()),
            );
        }
        componentContainerToDelete.remove();
        const ComponentClass = GameComponents[component.constructor.name as keyof typeof GameComponents];
        entity.removeComponent(ComponentClass);

        entity.registry.removeEntityFromSystems(entity);
        entity.registry.addEntityToSystems(entity);
    };

    componentHeader.append(title);
    componentHeader.append(removeButton);
    componentContainer.append(componentHeader);

    const properties = Object.keys(component);

    for (const key of properties) {
        const form = getPropertyInput(key, (component as any)[key], component, entity.getId(), assetStore, registry);

        if (form) {
            componentContainer.append(form);
        }
    }

    if (properties.length === 0) {
        const li = document.createElement('li');
        li.className = 'd-flex align-center';
        li.innerText = 'No property for this component...';
        componentContainer.append(li);
    }

    return componentContainer;
};

export const getPropertyInput = (
    propertyName: string,
    propertyValue: string | number | boolean | Vector | Rectangle,
    component: Component,
    entityId: number,
    assetStore: AssetStore,
    registry: Registry,
) => {
    if (propertyValue === null) {
        return null;
    }

    if (component.constructor.name === 'SpriteComponent' && propertyName === 'assetId') {
        const container = document.createElement('div');
        container.className = 'd-flex flex-col';

        const select = document.createElement('select');
        select.id = propertyName + '-' + entityId;

        const textureIds = assetStore.getAllTexturesIds();
        const options: { value: string; text: string }[] = [];

        for (const textureId of textureIds) {
            options.push({ value: textureId, text: textureId ? textureId : 'Unknown' });
        }

        options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            select.appendChild(option);
        });

        select.value = (component as any)[propertyName];

        select.addEventListener('change', (event: Event): void => {
            const target = event.target as HTMLSelectElement;
            (component as any)[propertyName] = target.value;

            const currentSpriteImage = document.getElementById('spritesheet-' + entityId) as HTMLImageElement;

            if (!currentSpriteImage) {
                throw new Error('Could not find spritesheet image for entity with id ' + entityId);
            }

            saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, registry, assetStore);
            const newAssetImg = assetStore.getTexture((component as GameComponents.SpriteComponent).assetId);
            currentSpriteImage.src = newAssetImg.src;
            currentSpriteImage.style.maxHeight = (newAssetImg.height > 100 ? newAssetImg.height : 100) + 'px';
        });

        const propertyLi = createListItem(propertyName, select);

        const spriteImage = document.createElement('img');
        const assetImg = assetStore.getTexture((component as GameComponents.SpriteComponent).assetId);
        spriteImage.src = assetImg.src;
        spriteImage.style.objectFit = 'contain';
        spriteImage.style.maxHeight = assetImg.height + 'px';
        spriteImage.style.maxWidth = '100%';
        spriteImage.style.height = 'auto';
        spriteImage.style.width = 'auto';
        spriteImage.id = 'spritesheet-' + entityId;

        container.append(propertyLi);
        container.append(spriteImage);

        return container;
    }

    if (Array.isArray(propertyValue)) {
        const arrayContainer = document.createElement('div');
        for (const property of propertyValue as Array<any>) {
            arrayContainer.append(
                createListItemWithInput(propertyName, property, component, entityId, registry, assetStore),
            );
        }

        return arrayContainer;
    }

    return createListItemWithInput(propertyName, propertyValue, component, entityId, registry, assetStore);
};

export const createListItem = (label: string, input: HTMLElement): HTMLLIElement => {
    const li = document.createElement('li');
    li.className = 'd-flex space-between align-center';

    const span = document.createElement('span');
    span.innerText = label;
    span.className = 'label-text';

    li.append(span);
    li.append(input);
    return li;
};

export const createInput = (
    type: 'text' | 'number' | 'checkbox',
    id: string,
    value: string | number | boolean,
): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    if (type === 'checkbox') {
        input.checked = Boolean(value);
    } else {
        input.value = String(value);
    }
    return input;
};

export const createListItemWithInput = (
    propertyName: string,
    propertyValue: string | number | boolean | object,
    component: Component,
    entityId: number,
    registry: Registry,
    assetStore: AssetStore,
) => {
    return createListItemWithInputRec(
        propertyName,
        propertyName,
        propertyName,
        propertyValue,
        component,
        entityId,
        registry,
        assetStore,
    );
};

export const createListItemWithInputRec = (
    id: string,
    label: string,
    propertyName: string,
    propertyValue: string | number | boolean | object,
    component: Component,
    entityId: number,
    registry: Registry,
    assetStore: AssetStore,
) => {
    switch (typeof propertyValue) {
        case 'string': {
            const textInput = createInput('text', id + '-' + propertyName + '-' + entityId, propertyValue);
            textInput.addEventListener('input', event => {
                const target = event.target as HTMLInputElement;
                (component as any)[propertyName] = target.value;
                saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, registry, assetStore);
            });

            const propertyLi = createListItem(label, textInput);
            return propertyLi;
        }
        case 'number': {
            const numberInput = createInput('number', id + '-' + propertyName + '-' + entityId, propertyValue);
            numberInput.addEventListener('input', event => {
                const target = event.target as HTMLInputElement;
                (component as any)[propertyName] = parseFloat(target.value);
                saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, registry, assetStore);
            });
            const propertyLi = createListItem(label, numberInput);
            return propertyLi;
        }
        case 'boolean': {
            const checkBoxInput = createInput('checkbox', id + '-' + propertyName + '-' + entityId, propertyValue);
            checkBoxInput.addEventListener('input', event => {
                const target = event.target as HTMLInputElement;
                (component as any)[propertyName] = target.checked;
                saveCurrentLevelToLocalStorage(Editor.editorSettings.selectedLevel, registry, assetStore);
            });
            const propertyLi = createListItem(label, checkBoxInput);
            return propertyLi;
        }
        case 'object': {
            const objectContainer = document.createElement('div');

            for (const property in propertyValue) {
                objectContainer.append(
                    createListItemWithInputRec(
                        id,
                        label + '-' + property,
                        property,
                        propertyValue[property as keyof typeof propertyValue],
                        propertyValue,
                        entityId,
                        registry,
                        assetStore,
                    ),
                );
            }

            return objectContainer;
        }
        default:
            throw new Error(
                `Uknown type of property ${propertyName} with value ${propertyValue} for component ${component.constructor.name}`,
            );
    }
};
