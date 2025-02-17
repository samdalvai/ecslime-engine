import { expect } from '@jest/globals';

import BoxColliderComponent from '../../src/components/BoxColliderComponent';
import TransformComponent from '../../src/components/TransformComponent';
import Registry from '../../src/ecs/Registry';
import EventBus from '../../src/event-bus/EventBus';
import CollisionEvent from '../../src/events/CollisionEvent';
import CollisionSystem from '../../src/systems/CollisionSystem';

describe('Testing Collision system related functions', () => {
    test('Two entities having a box collider intersecting should collide with one another', () => {
        const registry = new Registry();
        const eventBus = new EventBus();

        const entityA = registry.createEntity();
        registry.addComponent(entityA, TransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);
        registry.addComponent(entityA, BoxColliderComponent, 50, 50, { x: 0, y: 0 });

        const entityB = registry.createEntity();
        registry.addComponent(entityB, TransformComponent, { x: 125, y: 125 }, { x: 1, y: 1 }, 0);
        registry.addComponent(entityB, BoxColliderComponent, 50, 50, { x: 0, y: 0 });

        registry.addSystem(CollisionSystem);

        registry.update();

        class MyClass {
            value = 0;

            myCallBack() {
                this.value = 1;
            }
        }

        const myClassInstance = new MyClass();

        eventBus.subscribeToEvent(CollisionEvent, myClassInstance, myClassInstance.myCallBack);
        registry.getSystem(CollisionSystem)?.update(eventBus);

        expect(myClassInstance.value).toBe(1);
    });

    test('Two entities having a box collider not intersecting should not collide with one another', () => {
        const registry = new Registry();
        const eventBus = new EventBus();

        const entityA = registry.createEntity();
        registry.addComponent(entityA, TransformComponent, { x: 100, y: 100 }, { x: 1, y: 1 }, 0);
        registry.addComponent(entityA, BoxColliderComponent, 50, 50, { x: 0, y: 0 });

        const entityB = registry.createEntity();
        registry.addComponent(entityB, TransformComponent, { x: 200, y: 200 }, { x: 1, y: 1 }, 0);
        registry.addComponent(entityB, BoxColliderComponent, 50, 50, { x: 0, y: 0 });

        registry.addSystem(CollisionSystem);

        registry.update();

        class MyClass {
            value = 0;

            myCallBack() {
                this.value = 1;
            }
        }

        const myClassInstance = new MyClass();

        eventBus.subscribeToEvent(CollisionEvent, myClassInstance, myClassInstance.myCallBack);
        registry.getSystem(CollisionSystem)?.update(eventBus);

        expect(myClassInstance.value).toBe(0);
    });
});
