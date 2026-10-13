import { describe, expect, jest, test } from '@jest/globals';

import Component from '../../../src/ecs/Component';
import Registry from '../../../src/ecs/Registry';
import { createComponentCatalog, enumOptions } from '../../../src/serialization/componentCatalog';
import { deserializeEntities, deserializeEntity } from '../../../src/serialization/deserialization';
import { EntityMap } from '../../../src/types/map';
import {
    MockEnumComponent,
    MockMetadataComponent,
    MockNestedComponent,
    MockNumericEnum,
    MockRigidBodyComponent,
    MockStateComponent,
    MockStringEnum,
    MockTransformComponent,
} from '../mocks/components';

enum OtherStringEnum {
    FIRST = 'first',
}

enum OtherNumericEnum {
    ZERO,
}

const enumCatalog = createComponentCatalog(
    { MockEnumComponent },
    {
        MockEnumComponent: {
            properties: {
                stringValue: { enum: enumOptions(MockStringEnum) },
                numericValue: { enum: enumOptions(MockNumericEnum) },
            },
        },
    },
);

const stateCatalog = createComponentCatalog(
    { MockStateComponent },
    { MockStateComponent: { properties: { state: { enum: ['idle', 'run'] } } } },
);

const enumEntityMap = (properties: Record<string, unknown>): EntityMap => ({
    components: [{ name: 'MockEnumComponent' as any, properties: properties as any }],
});

const componentCatalog = createComponentCatalog({
    MockRigidBodyComponent,
    MockTransformComponent,
    MockNestedComponent,
});

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
        });
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
        const testOnlyCatalog = createComponentCatalog({ TestOnlyComponent });

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

    test('Should keep the constructor default for properties excluded by catalog metadata', () => {
        const metadataCatalog = createComponentCatalog(
            { MockMetadataComponent },
            { MockMetadataComponent: { properties: { value2: { deserialize: false } } } },
        );

        const registry = new Registry();

        const entityMap: EntityMap = {
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

        const entity = deserializeEntity(entityMap, registry, metadataCatalog);
        registry.update();

        expect(entity.getComponent(MockMetadataComponent)).toEqual({
            value1: 10,
            value2: 0,
        });
    });

    test('Should not share nested objects between the entity map and deserialized components', () => {
        const registry = new Registry();

        const entityMap: EntityMap = {
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

        const entity1 = deserializeEntity(entityMap, registry, componentCatalog);
        const entity2 = deserializeEntity(entityMap, registry, componentCatalog);
        registry.update();

        const transform1 = entity1.getComponent(MockTransformComponent);
        const transform2 = entity2.getComponent(MockTransformComponent);

        transform1.position.x = 500;
        (entityMap.components[0].properties as { position: { x: number } }).position.x = 700;

        expect(transform2.position).toEqual({ x: 100, y: 100 });
        expect(transform1.position).not.toBe(transform2.position);
    });

    test('Should only accept metadata for known components, properties and options', () => {
        createComponentCatalog(
            { MockMetadataComponent },
            {
                // @ts-expect-error unknown component name
                UnknownComponent: {},
            },
        );

        createComponentCatalog(
            { MockMetadataComponent },
            {
                MockMetadataComponent: {
                    properties: {
                        // @ts-expect-error unknown property name
                        value3: { serialize: false },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockMetadataComponent },
            {
                MockMetadataComponent: {
                    properties: {
                        // @ts-expect-error unknown property option
                        value1: { serialze: false },
                    },
                },
            },
        );
    });

    test('Should deserialize values allowed by enum metadata', () => {
        const registry = new Registry();

        const entity = deserializeEntity(
            enumEntityMap({ stringValue: 'second', numericValue: 2 }),
            registry,
            enumCatalog,
        );
        registry.update();

        expect(entity.getComponent(MockEnumComponent)).toEqual({
            stringValue: MockStringEnum.SECOND,
            numericValue: MockNumericEnum.TWO,
            position: { x: 0, y: 0 },
        });
    });

    test('Should keep the constructor default and warn for values not allowed by enum metadata', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const registry = new Registry();

        const entity = deserializeEntity(
            enumEntityMap({ stringValue: 'bogus', numericValue: '2' }),
            registry,
            enumCatalog,
        );
        registry.update();

        expect(entity.getComponent(MockEnumComponent)).toEqual({
            stringValue: MockStringEnum.FIRST,
            numericValue: MockNumericEnum.ZERO,
            position: { x: 0, y: 0 },
        });
        expect(warn).toHaveBeenCalledTimes(2);

        warn.mockRestore();
    });

    test('Should deserialize values allowed by a list of enum values', () => {
        const registry = new Registry();

        const entity = deserializeEntity(
            { components: [{ name: 'MockStateComponent' as any, properties: { state: 'run' } as any }] },
            registry,
            stateCatalog,
        );
        registry.update();

        expect(entity.getComponent(MockStateComponent)).toEqual({ state: 'run' });
    });

    test('Should keep the constructor default and warn for values not in a list of enum values', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const registry = new Registry();

        const entity = deserializeEntity(
            { components: [{ name: 'MockStateComponent' as any, properties: { state: 'walk' } as any }] },
            registry,
            stateCatalog,
        );
        registry.update();

        expect(entity.getComponent(MockStateComponent)).toEqual({ state: 'idle' });
        expect(warn).toHaveBeenCalledTimes(1);

        warn.mockRestore();
    });

    test('Should only accept enum metadata matching the property type', () => {
        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        stringValue: { enum: [MockStringEnum.FIRST, MockStringEnum.SECOND] },
                        numericValue: { enum: [MockNumericEnum.ZERO, MockNumericEnum.ONE] },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error string enum on a numeric property
                        numericValue: { enum: enumOptions(MockStringEnum) },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error enum objects must be passed through enumOptions
                        stringValue: { enum: MockStringEnum },
                        // @ts-expect-error enum objects must be passed through enumOptions
                        numericValue: { enum: MockNumericEnum },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error list containing a value outside the property type
                        stringValue: { enum: [MockStringEnum.FIRST, 'third'] },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockStateComponent },
            {
                MockStateComponent: {
                    properties: {
                        // @ts-expect-error list containing a value outside the string union
                        state: { enum: ['idle', 'walk'] },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error options of a different string enum
                        stringValue: { enum: enumOptions(OtherStringEnum) },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error options of a different numeric enum
                        numericValue: { enum: enumOptions(OtherNumericEnum) },
                    },
                },
            },
        );

        createComponentCatalog(
            { MockEnumComponent },
            {
                MockEnumComponent: {
                    properties: {
                        // @ts-expect-error enums are only allowed on string or number properties
                        position: { enum: enumOptions(MockStringEnum) },
                    },
                },
            },
        );
    });
});
