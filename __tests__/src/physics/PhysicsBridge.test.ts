import { describe, expect, test } from '@jest/globals';
import { ShapeType } from 'gravity.js';

import Registry from '../../../src/ecs/Registry';
import PhysicsBridge from '../../../src/physics/PhysicsBridge';
import { PhysicsBodyOptions, PhysicsShape } from '../../../src/physics/PhysicsBodyOptions';

const shapeCases: Array<[PhysicsShape, ShapeType]> = [
    [{ kind: 'box', width: 20, height: 10 }, ShapeType.BOX],
    [{ kind: 'circle', radius: 10 }, ShapeType.CIRCLE],
    [{ kind: 'capsule', halfHeight: 10, radius: 5 }, ShapeType.CAPSULE],
    [{ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }] }, ShapeType.POLYGON],
    [{ kind: 'segment', length: 20, horizontal: true }, ShapeType.SEGMENT],
];

describe('PhysicsBridge body creation', () => {
    test.each(shapeCases)('creates %p bodies from plain shape data', (shape, expectedType) => {
        const bridge = new PhysicsBridge();
        const entity = new Registry().createEntity();
        const options: PhysicsBodyOptions = { shape, mass: shape.kind === 'segment' ? 0 : 2 };

        bridge.addPhysicsBody(entity, { x: 12, y: 34 }, options);

        const body = bridge.getPhysicsBodyByEntity(entity);
        expect(body.shapeType).toBe(expectedType);
        expect(body.position.x).toBe(12);
        expect(body.position.y).toBe(34);
        expect(body.mass).toBe(options.mass);
    });

    test('applies density and optional body properties', () => {
        const bridge = new PhysicsBridge();
        const entity = new Registry().createEntity();

        bridge.addPhysicsBody(entity, { x: 3, y: 4 }, {
            shape: { kind: 'circle', radius: 10 },
            density: 2,
            restitution: 0,
            friction: 0,
            rollingResistance: 0,
            rotation: 0.5,
            velocity: { x: 6, y: -7 },
            angularVelocity: 3,
            canRotate: false,
            gravityScale: 0,
            isBullet: true,
            collisionCategory: 2,
            collisionMask: 1,
        });

        const body = bridge.getPhysicsBodyByEntity(entity);
        expect(body.density).toBe(2);
        expect(body.restitution).toBe(0);
        expect(body.friction).toBe(0);
        expect(body.rollingResistance).toBe(0);
        expect(body.rotation).toBe(0.5);
        expect(body.velocity.x).toBe(6);
        expect(body.velocity.y).toBe(-7);
        expect(body.angularVelocity).toBe(3);
        expect(body.canRotate).toBe(false);
        expect(body.gravityScale).toBe(0);
        expect(body.isBullet).toBe(true);
        expect(body.collisionCategory).toBe(2);
        expect(body.collisionMask).toBe(1);
        expect(() =>
            bridge.addPhysicsBody(entity, { x: 0, y: 0 }, { shape: { kind: 'box', width: 1, height: 1 }, mass: 1 }),
        ).toThrow('already has a physics body');
    });
});
