import Entity from '../ecs/Entity';
import Registry from '../ecs/Registry';
import { EntityMap } from '../types/map';
import { ComponentCatalog } from './componentCatalog';

/**
 * Components are created with `new ComponentClass()` and then assigned the serialized properties,
 * so every component must be constructible without arguments.
 */
// TODO: handle enums through component metadata
export const deserializeEntity = (
    entityMap: EntityMap,
    registry: Registry,
    componentCatalog: ComponentCatalog,
): Entity => {
    const entity = registry.createEntity();

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

            // Clone so the component does not share nested objects (e.g. vectors) with the entity map
            (componentInstance as Record<string, unknown>)[property] = structuredClone(value);
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
