import Entity from '../ecs/Entity';
import Registry from '../ecs/Registry';
import { EntityMap } from '../types/map';
import { ComponentCatalog, resolveEnumOptions } from './componentCatalog';

/**
 * Components are created with `new ComponentClass()` and then assigned the serialized properties,
 * so every component must be constructible without arguments.
 */
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
            const propertyMetadata = metadata?.properties?.[property];

            // Properties excluded from deserialization keep the constructor default
            if (propertyMetadata?.deserialize === false) {
                continue;
            }

            // Values that are not allowed by the enum also keep the constructor default
            if (
                propertyMetadata?.enum &&
                !resolveEnumOptions(propertyMetadata.enum).some(option => option.value === value)
            ) {
                console.warn(
                    `Invalid value ${JSON.stringify(value)} for enum property ${component.name}.${property}, using the default value`,
                );
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
