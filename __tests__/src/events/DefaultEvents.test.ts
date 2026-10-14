import { beforeEach, describe, expect, test } from '@jest/globals';
import { EventBus } from 'ecslime-engine';

import Component, { IComponent } from '../../../src/ecs/Component';
import Registry from '../../../src/ecs/Registry';
import ComponentAddedEvent from '../../../src/events/ComponentAddedEvent';
import ComponentRemovedEvent from '../../../src/events/ComponentRemovedEvent';
import EntityCreatedEvent from '../../../src/events/EntityCreatedEvent';
import EntityKilledEvent from '../../../src/events/EntityKilledEvent';

describe('Testing Default events', () => {
    beforeEach(() => {
        IComponent.resetIds();
    });

    test('Registry should emit EntityCreated event when a new entity is created', () => {
        const eventBus = new EventBus();
        const registry = new Registry(eventBus);

        let flag = false;
        eventBus.subscribeToEvent(EntityCreatedEvent, this, () => (flag = true));

        registry.createEntity();

        expect(flag).toBe(true);
    });

    test('Registry should emit EntityKilled event when an entity is killed', () => {
        const eventBus = new EventBus();
        const registry = new Registry(eventBus);
        const entity = registry.createEntity();

        let flag = false;
        eventBus.subscribeToEvent(EntityKilledEvent, this, () => (flag = true));

        entity.kill();

        expect(flag).toBe(true);
    });

    test('Registry should emit ComponentAdded event when a component is added to an entity', () => {
        class MyComponent extends Component {}

        const eventBus = new EventBus();
        const registry = new Registry(eventBus);
        const entity = registry.createEntity();

        let flag = false;
        eventBus.subscribeToEvent(ComponentAddedEvent, this, () => (flag = true));

        entity.addComponent(MyComponent);

        expect(flag).toBe(true);
    });

    test('Registry should emit ComponentAdded event when a component is removed from an entity', () => {
        class MyComponent extends Component {}

        const eventBus = new EventBus();
        const registry = new Registry(eventBus);
        const entity = registry.createEntity();
        eventBus.subscribeToEvent(ComponentRemovedEvent, this, () => (flag = true));
        entity.addComponent(MyComponent);

        let flag = false;

        entity.removeComponent(MyComponent);

        expect(flag).toBe(true);
    });
});
