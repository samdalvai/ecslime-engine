import Entity from '../ecs/Entity';
import Registry from '../ecs/Registry';
import { EntityMap } from '../types/map';
import { ComponentCatalog } from './componentCatalog';

// TODO: this logic is brittle, it relies on having components with default parameters in the constructor, and also we cannot
// handle enums in a good way
export const deserializeEntity = (
    entityMap: EntityMap,
    registry: Registry,
    componentCatalog: ComponentCatalog,
): Entity => {
    const entity = registry.createEntity();

    // TODO: this logic fails on prod environments where code is minified/obfuscated
    // to test this locally run: npx parcel build apps/game/game.html && mv dist/game.html dist/index.html && npx serve dist
    // current fix for prod is to add the flag --no-optimize to the build command
    // npx parcel build apps/game/game.html --no-optimize && mv dist/game.html dist/index.html && npx serve dist
    // TODO: Check if this comment is still relevant
    for (const component of entityMap.components) {
        const componentDefinition = componentCatalog.get(component.name);

        if (!componentDefinition) {
            throw new Error(`Could not find component definition for ${component.name}`);
        }

        const ComponentClass = componentDefinition.constructor;
        const metadata = componentDefinition.metadata;
        const componentInstance = new ComponentClass();

        for (const [property, value] of Object.entries(component.properties)) {
            // Properties excluded from deserialization keep the constructor default
            if (metadata?.properties?.[property]?.deserialize === false) {
                continue;
            }

            // TODO: do we need structuredClone here?
            (componentInstance as Record<string, unknown>)[property] = value;
        }

        entity.addComponentByInstance(componentInstance);
    }

    if (entityMap.tag) {
        entity.tag(entityMap.tag);
    }

    if (entityMap.group) {
        entity.group(entityMap.group);
    }

    return entity;
};

export const deserializeEntities = (
    entities: EntityMap[],
    registry: Registry,
    componentCatalog: ComponentCatalog,
): Entity[] => {
    const entitiesList: Entity[] = [];

    for (const entity of entities) {
        entitiesList.push(deserializeEntity(entity, registry, componentCatalog));
    }

    return entitiesList;
};
