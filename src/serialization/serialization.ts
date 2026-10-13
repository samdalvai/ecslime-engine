import Engine from '../Engine';
import AssetStore from '../asset-store/AssetStore';
import Entity from '../ecs/Entity';
import Registry from '../ecs/Registry';
import { ComponentMap, EntityMap, LevelData } from '../types/map';
import { ComponentCatalog } from './componentCatalog';

export const serializeEntity = (entity: Entity, componentCatalog?: ComponentCatalog): EntityMap => {
    const components: ComponentMap[] = [];

    const entityComponents = entity.getComponents();

    for (const component of entityComponents) {
        const componentDefinition = componentCatalog?.getByConstructor(component);
        const metadata = componentDefinition?.metadata;
        const properties: Record<string, unknown> = {};

        for (const [property, value] of Object.entries(component)) {
            if (metadata?.properties?.[property]?.serialize === false) {
                continue;
            }

            properties[property] = value;
        }

        components.push({
            name: componentDefinition?.name ?? component.constructor.name,
            properties,
        } as ComponentMap);
    }

    const tag = entity.getTag();
    const group = entity.getGroup();

    return {
        tag,
        group,
        components,
    };
};

export const serializeEntities = (entities: Entity[], componentCatalog?: ComponentCatalog): EntityMap[] => {
    const entitiesMap: EntityMap[] = [];

    for (const entity of entities) {
        entitiesMap.push(serializeEntity(entity, componentCatalog));
    }

    return entitiesMap;
};

export const serializeLevel = (
    registry: Registry,
    assetStore: AssetStore,
    componentCatalog?: ComponentCatalog,
): LevelData => {
    const entities = registry.getAllEntities();
    return {
        textures: assetStore.getTexturesFilePaths(),
        sounds: assetStore.getSoundsFilePaths(),
        mapWidth: Engine.mapWidth,
        mapHeight: Engine.mapHeight,
        entities: serializeEntities([...entities], componentCatalog),
    };
};
