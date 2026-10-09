import { describe, expect, test } from '@jest/globals';

import Component from '../../../src/ecs/Component';
import Registry from '../../../src/ecs/Registry';
import { createComponentCatalog } from '../../../src/serialization/componentCatalog';
import {
    deserializeEntities,
    deserializeEntity,
} from '../../../src/serialization/deserialization';
import { EntityMap } from '../../../src/types/map';
import { MockNestedComponent, MockRigidBodyComponent, MockTransformComponent } from '../mocks/components';

const componentCatalog = createComponentCatalog([
    { name: 'MockRigidBodyComponent', constructor: MockRigidBodyComponent },
    { name: 'MockTransformComponent', constructor: MockTransformComponent },
    { name: 'MockNestedComponent', constructor: MockNestedComponent },
]);

describe('Testing deserialization related functions', () => {
    test('Should deserialize entity Map to Entity with one component', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            components: [
                {
                    name: 'MockTransformComponent',
                    properties: {
                        position: { x: 100, y: 100 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
                    },
                },
            ],
        };

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        registry.update();
        const transform = entity.getComponent(MockTransformComponent);

        expect(transform).toEqual({
            position: {
                x: 100,
                y: 100,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });
    });

    test('Should deserialize entity Map to Entity with two components', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            components: [
                {
                    name: 'MockTransformComponent',
                    properties: {
                        position: { x: 100, y: 100 },
                        scale: { x: 1, y: 1 },
                        rotation: 0,
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

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        registry.update();
        const transform = entity.getComponent(MockTransformComponent);
        const rigidbody = entity.getComponent(MockRigidBodyComponent);

        expect(transform).toEqual({
            position: {
                x: 100,
                y: 100,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });
        expect(rigidbody).toEqual({
            velocity: {
                x: 100,
                y: 100,
            },
            direction: {
                x: 1,
                y: 0,
            },
        });
    });

    test('Should deserialize entity Map to Entity with one component having nested properties', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            components: [
                {
                    name: 'MockNestedComponent',
                    properties: {
                        object: { nested: { value1: 1, value2: 2 }, plain: 3 },
                    },
                },
            ],
        };

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        registry.update();
        const nestedComp = entity.getComponent(MockNestedComponent);

        expect(nestedComp).toEqual({
            object: { nested: { value1: 1, value2: 2 }, plain: 3 },
        })
    });

    test('Should deserialize entity Map to Entity having tag', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            tag: 'test',
            components: [],
        };

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        const entityTag = entity.getTag();

        expect(entityTag).toEqual('test');
    });

    test('Should deserialize entity Map to Entity having group', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            group: 'test',
            components: [],
        };

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        const entityGroup = entity.getGroup();

        expect(entityGroup).toEqual('test');
    });

    test('Should deserialize entity Map to Entity having tag and group', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
            tag: 'test',
            group: 'test',
            components: [],
        };

        const entity = deserializeEntity(entityMap, registry, componentCatalog);
        const entityTag = entity.getTag();
        const entityGroup = entity.getGroup();

        expect(entityTag).toEqual('test');
        expect(entityGroup).toEqual('test');
    });

    test('Should deserialize list of entityMap to entities with one component', () => {
        const registry = new Registry();

        const entityMaps: EntityMap[] = [
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 100, y: 100 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
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
                        },
                    },
                ],
            },
        ];

        const entities = deserializeEntities(entityMaps, registry, componentCatalog);
        registry.update();
        const transform1 = entities[0].getComponent(MockTransformComponent);
        const transform2 = entities[1].getComponent(MockTransformComponent);

        expect(transform1).toEqual({
            position: {
                x: 100,
                y: 100,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });

        expect(transform2).toEqual({
            position: {
                x: 200,
                y: 200,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });
    });

    test('Should deserialize list of entityMap to entities with two components', () => {
        const registry = new Registry();

        const entityMaps: EntityMap[] = [
            {
                components: [
                    {
                        name: 'MockTransformComponent',
                        properties: {
                            position: { x: 100, y: 100 },
                            scale: { x: 1, y: 1 },
                            rotation: 0,
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

        const entities = deserializeEntities(entityMaps, registry, componentCatalog);
        registry.update();
        const transform1 = entities[0].getComponent(MockTransformComponent);
        const transform2 = entities[1].getComponent(MockTransformComponent);
        const rigidbody1 = entities[0].getComponent(MockRigidBodyComponent);
        const rigidbody2 = entities[1].getComponent(MockRigidBodyComponent);

        expect(transform1).toEqual({
            position: {
                x: 100,
                y: 100,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });

        expect(transform2).toEqual({
            position: {
                x: 200,
                y: 200,
            },
            scale: {
                x: 1,
                y: 1,
            },
            rotation: 0,
            isFixed: false,
        });

        expect(rigidbody1).toEqual({
            velocity: {
                x: 100,
                y: 100,
            },
            direction: {
                x: 1,
                y: 0,
            },
        });

        expect(rigidbody2).toEqual({
            velocity: {
                x: 200,
                y: 200,
            },
            direction: {
                x: 0,
                y: 1,
            },
        });
    });

    test('Should deserialize entity with a component from the supplied catalog', () => {
        class TestOnlyComponent extends Component {
            value: number;

            constructor(value = 0) {
                super();
                this.value = value;
            }
        }

        const registry = new Registry();
        const testOnlyCatalog = createComponentCatalog([{ name: 'TestOnlyComponent', constructor: TestOnlyComponent }]);

        const entityMap: EntityMap = {
            components: [
                {
                    name: 'TestOnlyComponent',
                    properties: {
                        value: 42,
                    },
                },
            ],
        };

        const entity = deserializeEntity(entityMap, registry, testOnlyCatalog);
        registry.update();

        expect(entity.getComponent(TestOnlyComponent)).toEqual({
            value: 42,
        });
    });
});
