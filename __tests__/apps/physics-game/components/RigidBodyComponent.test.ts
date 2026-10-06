import { describe, expect, test } from '@jest/globals';

import Registry from '../../../../src/ecs/Registry';
import { createComponentCatalog } from '../../../../src/serialization/componentCatalog';
import { deserializeEntity } from '../../../../src/serialization/deserialization';
import { serializeEntity } from '../../../../src/serialization/serialization';
import RigidBodyComponent from '../../../../apps/physics-game/components/RigidBodyComponent';

const componentCatalog = createComponentCatalog([
    { name: 'RigidBodyComponent', constructor: RigidBodyComponent },
]);

describe('RigidBodyComponent serialization', () => {
    test('editor-added body has editable options that survive a JSON round trip', () => {
        const registry = new Registry();
        const entity = registry.createEntity();
        const rigidBody = entity.addComponent(RigidBodyComponent);
        registry.update();

        expect(rigidBody.options).toEqual({ shape: { kind: 'box', width: 32, height: 32 }, mass: 1 });

        rigidBody.options.shape = { kind: 'circle', radius: 16 };
        rigidBody.options.mass = 2;
        rigidBody.options.friction = 0.4;

        const saved = JSON.parse(JSON.stringify(serializeEntity(entity)));
        const restoredRegistry = new Registry();
        const restoredEntity = deserializeEntity(saved, restoredRegistry, componentCatalog);
        restoredRegistry.update();

        expect(restoredEntity.getComponent(RigidBodyComponent)?.options).toEqual(rigidBody.options);
    });

    test('separately added bodies do not share default options', () => {
        const first = new RigidBodyComponent();
        const second = new RigidBodyComponent();
        first.options.shape = { kind: 'circle', radius: 16 };

        expect(second.options).toEqual({ shape: { kind: 'box', width: 32, height: 32 }, mass: 1 });
    });
});
