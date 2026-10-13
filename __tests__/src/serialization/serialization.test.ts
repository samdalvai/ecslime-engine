import { describe, expect, test } from '@jest/globals';

import Engine from '../../../src/Engine';
import AssetStore from '../../../src/asset-store/AssetStore';
import Component from '../../../src/ecs/Component';
import Entity from '../../../src/ecs/Entity';
import Registry from '../../../src/ecs/Registry';
import { createComponentCatalog } from '../../../src/serialization/componentCatalog';
import { serializeEntities, serializeEntity, serializeLevel } from '../../../src/serialization/serialization';
import { EntityMap, LevelData } from '../../../src/types/map';
import {
    MockMetadataComponent,
    MockNestedComponent,
    MockRigidBodyComponent,
    MockTransformComponent,
} from '../mocks/components';

describe('Testing serialization related functions', () => {
    test('Should serialize entity with one component to a valid Entity Map', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);

        const expected: EntityMap = {
            components: [
                {
                    name: 'MockTransformComponent',
                    properties: {
                        position: { x: 100, y: 100 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        isFixed: false,
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize entity with two components to a valid Entity Map', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);
        entity.addComponent(MockRigidBodyComponent, { x: 100, y: 100 }, { x: 1, y: 0 });

        const expected: EntityMap = {
            components: [
                {
                    name: 'MockTransformComponent',
                    properties: {
                        position: { x: 100, y: 100 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                        isFixed: false,
                    },
                },
                {
                    name: 'MockRigidBodyComponent',
                    properties: {
                        velocity: { x: 100, y: 100 },
                        direction: { x: 1, y: 0 },
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize entity with one component having nested properties to a valid Entity Map', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockNestedComponent, { nested: { value1: 1, value2: 2 }, plain: 3 });

        const expected: EntityMap = {
            components: [
                {
                    name: 'MockNestedComponent',
                    properties: {
                        object: { nested: { value1: 1, value2: 2 }, plain: 3 },
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize entity having tag', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.tag('test');

        const expected: EntityMap = {
            tag: 'test',
            components: [],
        };

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize entity having group', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.group('test');

        const expected: EntityMap = {
            group: 'test',
            components: [],
        };

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize entity having tag and group', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        entity.tag('test');
        entity.group('test');

        const expected: EntityMap = {
            tag: 'test',
            group: 'test',
            components: [],
        };

        expect(serializeEntity(entity)).toEqual(expected);
    });

    test('Should serialize list of entities with one component', () => {
        const registry = new Registry();

        const entity1 = registry.createEntity();
        entity1.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);

        const entity2 = registry.createEntity();
        entity2.addComponent(MockTransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 }, 0);

        const expected: EntityMap[] = [
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 100, y: 100 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
                            isFixed: false,
                        },
                    },
                ],
            },
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 200, y: 200 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
                            isFixed: false,
                        },
                    },
                ],
            },
        ];

        registry.update();

        expect(serializeEntities([entity1, entity2])).toEqual(expected);
    });

    test('Should serialize list of entities with two components', () => {
        const registry = new Registry();

        const entity1 = registry.createEntity();
        entity1.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);
        entity1.addComponent(MockRigidBodyComponent, { x: 100, y: 100 }, { x: 1, y: 0 });

        const entity2 = registry.createEntity();
        entity2.addComponent(MockTransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 }, 0);
        entity2.addComponent(MockRigidBodyComponent, { x: 200, y: 200 }, { x: 0, y: 1 });

        const expected: EntityMap[] = [
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 100, y: 100 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
                            isFixed: false,
                        },
                    },
                    {
                        name: 'MockRigidBodyComponent',
                        properties: {
                            velocity: { x: 100, y: 100 },
                            direction: { x: 1, y: 0 },
                        },
                    },
                ],
            },
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 200, y: 200 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
                            isFixed: false,
                        },
                    },
                    {
                        name: 'MockRigidBodyComponent',
                        properties: {
                            velocity: { x: 200, y: 200 },
                            direction: { x: 0, y: 1 },
                        },
                    },
                ],
            },
        ];

        registry.update();

        expect(serializeEntities([entity1, entity2])).toEqual(expected);
    });

    test('Should serialize list of entities with tag', () => {
        const registry = new Registry();

        const entity1 = registry.createEntity();
        entity1.tag('test1');

        const entity2 = registry.createEntity();
        entity2.tag('test2');

        const expected: EntityMap[] = [
            {
                tag: 'test1',
                components: [],
            },
            {
                tag: 'test2',
                components: [],
            },
        ];

        expect(serializeEntities([entity1, entity2])).toEqual(expected);
    });

    test('Should serialize list of entities with group', () => {
        const registry = new Registry();

        const entity1 = registry.createEntity();
        entity1.group('test1');

        const entity2 = registry.createEntity();
        entity2.group('test2');

        const expected: EntityMap[] = [
            {
                group: 'test1',
                components: [],
            },
            {
                group: 'test2',
                components: [],
            },
        ];

        expect(serializeEntities([entity1, entity2])).toEqual(expected);
    });

    test('Should serialize list of entities with tag and group', () => {
        const registry = new Registry();

        const entity1 = registry.createEntity();
        entity1.tag('test1');
        entity1.group('test1');

        const entity2 = registry.createEntity();
        entity2.tag('test2');
        entity2.group('test2');

        const expected: EntityMap[] = [
            {
                tag: 'test1',
                group: 'test1',
                components: [],
            },
            {
                tag: 'test2',
                group: 'test2',
                components: [],
            },
        ];

        expect(serializeEntities([entity1, entity2])).toEqual(expected);
    });

    test('Should not serialize properties excluded by catalog metadata', () => {
        const componentCatalog = createComponentCatalog(
            { MockMetadataComponent },
            { MockMetadataComponent: { properties: { value2: { serialize: false } } } },
        );

        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockMetadataComponent, 10, 20);

        const expected: EntityMap = {
            components: [
                {
                    name: 'MockMetadataComponent' as any,
                    properties: {
                        value1: 10,
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity, componentCatalog)).toEqual(expected);
    });

    test('Should not serialize entity references excluded by catalog metadata', () => {
        class MyComponent extends Component {
            myProperty: number;
            followedEntity: Entity | null;

            constructor(myProperty = 0, followedEntity: Entity | null = null) {
                super();
                this.myProperty = myProperty;
                this.followedEntity = followedEntity;
            }
        }

        const componentCatalog = createComponentCatalog(
            { MyComponent },
            { MyComponent: { properties: { followedEntity: { serialize: false } } } },
        );

        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MyComponent, 10, new Entity(2, registry));

        const expected: EntityMap = {
            components: [
                {
                    name: 'MyComponent' as any,
                    properties: {
                        myProperty: 10,
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity, componentCatalog)).toEqual(expected);
    });

    test('Should serialize all properties when the catalog has no metadata for the component', () => {
        const componentCatalog = createComponentCatalog({ MockMetadataComponent });

        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockMetadataComponent, 10, 20);

        const expected: EntityMap = {
            components: [
                {
                    name: 'MockMetadataComponent' as any,
                    properties: {
                        value1: 10,
                        value2: 20,
                    },
                },
            ],
        };

        registry.update();

        expect(serializeEntity(entity, componentCatalog)).toEqual(expected);
    });

    test('Should use the catalog name of the component when serializing', () => {
        const componentCatalog = createComponentCatalog({ RenamedComponent: MockMetadataComponent });

        const registry = new Registry();
        const entity = registry.createEntity();
        entity.addComponent(MockMetadataComponent, 10, 20);

        registry.update();

        expect(serializeEntity(entity, componentCatalog).components[0].name).toBe('RenamedComponent');
    });

    test('Should serialize level with one entity', () => {
        const registry = new Registry();
        const assetStore = new AssetStore();

        const entity = registry.createEntity();
        entity.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);

        const expected: LevelData = {
            mapWidth: 500,
            mapHeight: 500,
            entities: [
                {
                    components: [
                        {
                            name: 'MockTransformComponent',
                            properties: {
                                position: { x: 100, y: 100 },
                                scale: { x: 1, y: 1 },
                                rotation: 0,
                                isFixed: false,
                            },
                        },
                    ],
                },
            ],
            textures: [],
            sounds: [],
        };

        Engine.mapWidth = 500;
        Engine.mapHeight = 500;

        registry.update();

        expect(serializeLevel(registry, assetStore)).toEqual(expected);
    });

    test('Should serialize level with two entities', () => {
        const registry = new Registry();
        const assetStore = new AssetStore();

        const entity1 = registry.createEntity();
        entity1.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);

        const entity2 = registry.createEntity();
        entity2.addComponent(MockTransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 }, 0);

        const expected: LevelData = {
            mapWidth: 500,
            mapHeight: 500,
            entities: [
                {
                    components: [
                        {
                            name: 'MockTransformComponent',
                            properties: {
                                position: { x: 100, y: 100 },
                                scale: { x: 1, y: 1 },
                                rotation: 0,
                                isFixed: false,
                            },
                        },
                    ],
                },
                {
                    components: [
                        {
                            name: 'MockTransformComponent',
                            properties: {
                                position: { x: 200, y: 200 },
                                scale: { x: 1, y: 1 },
                                rotation: 0,
                                isFixed: false,
                            },
                        },
                    ],
                },
            ],
            textures: [],
            sounds: [],
        };

        Engine.mapWidth = 500;
        Engine.mapHeight = 500;

        registry.update();

        expect(serializeLevel(registry, assetStore)).toEqual(expected);
    });

    test('Should serialize level with one entity where another entity has been killed', () => {
        const registry = new Registry();
        const assetStore = new AssetStore();

        const entity1 = registry.createEntity();
        entity1.addComponent(MockTransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);

        const entity2 = registry.createEntity();
        entity2.addComponent(MockTransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 }, 0);

        entity1.kill();
        registry.update();

        const expected: LevelData = {
            mapWidth: 500,
            mapHeight: 500,
            entities: [
                {
                    components: [
                        {
                            name: 'MockTransformComponent',
                            properties: {
                                position: { x: 200, y: 200 },
                                scale: { x: 1, y: 1 },
                                rotation: 0,
                                isFixed: false,
                            },
                        },
                    ],
                },
            ],
            textures: [],
            sounds: [],
        };

        Engine.mapWidth = 500;
        Engine.mapHeight = 500;

        expect(serializeLevel(registry, assetStore)).toEqual(expected);
    });
});
