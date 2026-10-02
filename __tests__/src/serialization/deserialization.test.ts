import { describe, expect, test } from '@jest/globals';

import Component from '../../../src/ecs/Component';
import { createComponentCatalog } from '../../../src/ecs/ComponentCatalog';
import Registry from '../../../src/ecs/Registry';
import {
    deserializeEntities,
    deserializeEntity,
    getComponentConstructorParamNames,
    parseConstructorString,
} from '../../../src/serialization/deserialization';
import { EntityMap } from '../../../src/types/map';
import { DEFAULT_SPRITE } from '../../../src/utils/constants';
import { MockRigidBodyComponent, MockTransformComponent } from '../mocks/components';

const componentCatalog = createComponentCatalog([
    { name: 'MockRigidBodyComponent', constructor: MockRigidBodyComponent },
    { name: 'MockTransformComponent', constructor: MockTransformComponent },
]);

describe('Testing deserialization related functions', () => {
    test('Should parse constructor string from component string with no parameters', () => {
        const componentString =
            'class MyComponent extends (0, _componentDefault.default) { constructor() { super(); }}';
        const expected = '';
        expect(parseConstructorString(componentString)).toEqual(expected);
    });

    test('Should parse constructor string from component string with one parameter', () => {
        const componentString =
            'class MyComponent extends (0, _componentDefault.default) { constructor(test = 0) { super(); }}';
        const expected = 'test = 0';
        expect(parseConstructorString(componentString)).toEqual(expected);
    });

    test('Should parse constructor string from component string with constant from other module ', () => {
        const componentString =
            'class MyComponent extends (0, _componentDefault.default) { constructor(test = (0, _constants.MY_CONSTANT)) { super(); }}';
        const expected = 'test = (0, _constants.MY_CONSTANT)';
        expect(parseConstructorString(componentString)).toEqual(expected);
    });

    test('Should extract component constructor parameter names', () => {
        class MyComponent extends Component {
            myProperty1: number;
            myProperty2: number;

            constructor(myProperty1 = 0, myProperty2 = 0) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with custom order', () => {
        class MyComponent extends Component {
            myProperty1: number;
            myProperty2: number;

            constructor(myProperty2 = 0, myProperty1 = 0) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty2', 'myProperty1']);
    });

    test('Should extract component constructor parameter names with no initializer to parameters', () => {
        class MyComponent extends Component {
            myProperty1: number;
            myProperty2: number;

            constructor(myProperty1: number, myProperty2: number) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with a mix between initialized and uninitialized constructor properties', () => {
        class MyComponent extends Component {
            myProperty1: number;
            myProperty2: number;

            constructor(myProperty1: number, myProperty2 = 0) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with a mix between initialized and uninitialized constructor properties with mixed order', () => {
        class MyComponent extends Component {
            myProperty1: number;
            myProperty2: number;

            constructor(myProperty2 = 0, myProperty1: number) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty2', 'myProperty1']);
    });

    test('Should extract component constructor parameter names with objects as parameters', () => {
        class MyComponent extends Component {
            myProperty1: { x: number; y: number };
            myProperty2: { x: number; y: number };

            constructor(myProperty1 = { x: 1, y: 1 }, myProperty2: { x: number; y: number }) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with arrays as parameters', () => {
        class MyComponent extends Component {
            myProperty1: number[];
            myProperty2: { x: number; y: number }[];

            constructor(myProperty1 = [], myProperty2: { x: number; y: number }[]) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with boolean types', () => {
        class MyComponent extends Component {
            myProperty1: boolean;
            myProperty2: boolean;

            constructor(myProperty1 = true, myProperty2 = false) {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with string types', () => {
        class MyComponent extends Component {
            myProperty1: string;
            myProperty2: string;

            // eslint-disable-next-line quotes
            constructor(myProperty1 = 'hello', myProperty2 = 'whatever') {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with string types and constant as default initializer in the same module', () => {
        const DEFAULT_VALUE = 'test';

        class MyComponent extends Component {
            myProperty1: string;
            myProperty2: string;

            // eslint-disable-next-line quotes
            constructor(myProperty1 = DEFAULT_VALUE, myProperty2 = 'whatever') {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should extract component constructor parameter names with string types and constant as default initializer from another module', () => {
        class MyComponent extends Component {
            myProperty1: string;
            myProperty2: string;

            // eslint-disable-next-line quotes
            constructor(myProperty1 = DEFAULT_SPRITE, myProperty2 = 'whatever') {
                super();
                this.myProperty1 = myProperty1;
                this.myProperty2 = myProperty2;
            }
        }

        expect(getComponentConstructorParamNames(MyComponent)).toEqual(['myProperty1', 'myProperty2']);
    });

    test('Should throw error for component with no constructor', () => {
        class MyComponent extends Component {}

        expect(() => getComponentConstructorParamNames(MyComponent)).toThrowError();
    });

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
