import Component, { ComponentClass } from './Component';
import Pool, { IPool } from './Pool';
import Signature from './Signature';
import System, { SystemClass } from './System';

export default class Registry {
    numEntities: number;

    // [Array index = component type id] - [Pool index = entity id]
    componentPools: IPool[];

    // [Array index = entity id]
    entityComponentSignatures: Signature[];

    // [Map key = system type id]
    systems: Map<number, System>;

    entitiesToBeAdded: number[];
    entitiesToBeKilled: number[];

    // Entity tags (one tag name per entity)
    entityPerTag: Map<string, number>;
    tagPerEntity: Map<number, string>;

    // Entity groups (a set of entities per group name)
    entitiesPerGroup: Map<string, Set<number>>;
    groupPerEntity: Map<number, string>;

    freeIds: number[];

    constructor() {
        this.numEntities = 0;
        this.componentPools = [];
        this.entityComponentSignatures = [];
        this.systems = new Map();
        this.entitiesToBeAdded = [];
        this.entitiesToBeKilled = [];
        this.entityPerTag = new Map();
        this.tagPerEntity = new Map();
        this.entitiesPerGroup = new Map();
        this.groupPerEntity = new Map();
        this.freeIds = [];
    }

    update = <T extends Component>() => {
        for (const entity of this.entitiesToBeAdded) {
            this.addEntityToSystems(entity);
        }

        this.entitiesToBeAdded = [];

        for (const entity of this.entitiesToBeKilled) {
            this.removeEntityFromSystems(entity);
            this.entityComponentSignatures[entity].reset();

            for (let i = 0; i < this.componentPools.length; i++) {
                const pool = this.componentPools[i] as Pool<T>;
                if (pool) {
                    pool.removeEntityFromPool(entity);
                }
            }

            this.freeIds.push(entity);

            if (this.tagPerEntity.get(entity) !== undefined) {
                this.removeEntityTag(entity);
            }

            if (this.groupPerEntity.get(entity) !== undefined) {
                this.removeEntityGroup(entity);
            }
        }

        this.entitiesToBeKilled = [];
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Entity management
    ////////////////////////////////////////////////////////////////////////////////

    createEntity = (): number => {
        let entityId;

        if (this.freeIds.length === 0) {
            entityId = this.numEntities++;
            if (entityId >= this.entityComponentSignatures.length) {
                this.entityComponentSignatures[entityId] = new Signature();
            }
        } else {
            entityId = this.freeIds.pop() as number;
        }

        this.entitiesToBeAdded.push(entityId);
        // console.log('Entity created with id ' + entityId);

        return entityId;
    };

    killEntity = (entity: number) => {
        this.entitiesToBeKilled.push(entity);
        // console.log('Entity with id ' + entity.getId() + ' killed');
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Tag management
    ////////////////////////////////////////////////////////////////////////////////

    tagEntity = (entity: number, tag: string) => {
        const existingEntity = this.entityPerTag.get(tag);

        if (existingEntity !== undefined) {
            throw new Error('An entity with tag ' + tag + ' already exists with id ' + existingEntity);
        }

        this.entityPerTag.set(tag, entity);
        this.tagPerEntity.set(entity, tag);
    };

    entityHasTag = (entity: number, tag: string) => {
        const currentTag = this.tagPerEntity.get(entity);

        if (currentTag === undefined) {
            return false;
        }

        return currentTag === tag;
    };

    getEntityByTag = (tag: string) => {
        return this.entityPerTag.get(tag);
    };

    removeEntityTag = (entity: number) => {
        const currentTag = this.tagPerEntity.get(entity);

        if (currentTag === undefined) {
            console.warn('Could not find tag for entity with id ' + entity);
            return;
        }

        this.tagPerEntity.delete(entity);
        this.entityPerTag.delete(currentTag);
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Group management
    ////////////////////////////////////////////////////////////////////////////////

    groupEntity = (entity: number, group: string) => {
        const currentEntities = this.entitiesPerGroup.get(group);

        if (currentEntities === undefined) {
            this.entitiesPerGroup.set(group, new Set([entity]));
        } else {
            currentEntities.add(entity);
        }

        this.groupPerEntity.set(entity, group);
    };

    entityBelongsToGroup = (entity: number, group: string) => {
        const currentGroup = this.groupPerEntity.get(entity);

        if (currentGroup === undefined) {
            return false;
        }

        return currentGroup === group;
    };

    getEntitiesByGroup = (group: string) => {
        const currentEntities = this.entitiesPerGroup.get(group);

        if (currentEntities === undefined) {
            return [];
        }

        return [...currentEntities];
    };

    removeEntityGroup = (entity: number) => {
        const currentGroup = this.groupPerEntity.get(entity);

        if (currentGroup === undefined) {
            console.warn('Could not remove entity groups for entity with id ' + entity);
            return;
        }

        this.groupPerEntity.delete(entity);

        const currentEntities = this.entitiesPerGroup.get(currentGroup);

        if (currentEntities !== undefined) {
            currentEntities.delete(entity);

            if (currentEntities.size === 0) {
                this.entitiesPerGroup.delete(currentGroup);
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Component management
    ////////////////////////////////////////////////////////////////////////////////

    addComponent = <T extends Component>(
        entity: number,
        ComponentClass: ComponentClass<T>,
        ...args: ConstructorParameters<typeof ComponentClass>
    ) => {
        const componentId = ComponentClass.getComponentId();
        const entityId = entity;

        if (this.componentPools[componentId] === undefined) {
            const newComponentPool = new Pool<T>();
            this.componentPools[componentId] = newComponentPool;
        }

        const newComponent = new ComponentClass(...args);
        const componentPool = this.componentPools[componentId] as Pool<T>;
        componentPool?.set(entityId, newComponent);

        this.entityComponentSignatures[entityId].set(componentId);
        // console.log('Component with id ' + componentId + ' was added to entity with id ' + entityId);
    };

    removeComponent = <T extends Component>(entity: number, ComponentClass: ComponentClass<T>) => {
        const componentId = ComponentClass.getComponentId();
        const entityId = entity;

        // Remove the component from the component list for that entity
        const componentPool = this.componentPools[componentId] as Pool<T>;
        componentPool?.remove(entityId);

        // Set this component signature for that entity to false
        this.entityComponentSignatures[entityId].remove(componentId);

        // console.log('Component with id ' + componentId + ' was removed from entity id ' + entityId);
    };

    hasComponent = <T extends Component>(entity: number, ComponentClass: ComponentClass<T>): boolean => {
        const componentId = ComponentClass.getComponentId();
        const entityId = entity;
        return this.entityComponentSignatures[entityId].test(componentId);
    };

    getComponent = <T extends Component>(entity: number, ComponentClass: ComponentClass<T>): T | undefined => {
        const componentId = ComponentClass.getComponentId();
        const entityId = entity;

        const componentPool = this.componentPools[componentId] as Pool<T>;
        return componentPool?.get(entityId);
    };

    ////////////////////////////////////////////////////////////////////////////////
    // System management
    ////////////////////////////////////////////////////////////////////////////////

    addSystem = <T extends System>(SystemClass: SystemClass<T>, ...args: ConstructorParameters<typeof SystemClass>) => {
        const newSystem = new SystemClass(...args);
        this.systems.set(SystemClass.getSystemId(), newSystem);
    };

    removeSystem<T extends System>(SystemClass: SystemClass<T>) {
        this.systems.delete(SystemClass.getSystemId());
    }

    hasSystem<T extends System>(SystemClass: SystemClass<T>): boolean {
        return this.systems.get(SystemClass.getSystemId()) !== undefined;
    }

    getSystem<T extends System>(SystemClass: SystemClass<T>): T | undefined {
        const system = this.systems.get(SystemClass.getSystemId());

        if (system === undefined) {
            return undefined;
        }

        return system as T;
    }

    addEntityToSystems = (entity: number) => {
        const entityId = entity;

        const entityComponentSignature = this.entityComponentSignatures[entityId];

        for (const system of this.systems.values()) {
            const systemComponentSignature = system.getComponentSignature();

            // Skip checking if system signature is 0, otherwise it will add
            // all the entities to the system
            if (systemComponentSignature.signature === 0) {
                continue;
            }

            const isInterested =
                (entityComponentSignature.signature & systemComponentSignature.signature) ==
                systemComponentSignature.signature;

            if (isInterested) {
                system.addEntityToSystem(entity);
            }
        }
    };

    removeEntityFromSystems = (entity: number) => {
        for (const system of this.systems.values()) {
            system.removeEntityFromSystem(entity);
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
    // Registry resetting
    ////////////////////////////////////////////////////////////////////////////////

    clear = () => {
        this.numEntities = 0;
        this.componentPools = [];
        this.entityComponentSignatures = [];
        this.entitiesToBeAdded = [];
        this.entitiesToBeKilled = [];
        this.entityPerTag = new Map();
        this.tagPerEntity = new Map();
        this.entitiesPerGroup = new Map();
        this.groupPerEntity = new Map();
        this.freeIds = [];

        for (const system of this.systems.values()) {
            system.removeAllEntities();
        }
    };
}
