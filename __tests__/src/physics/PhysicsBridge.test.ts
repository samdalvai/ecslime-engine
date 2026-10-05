import { describe, expect, test } from '@jest/globals';

import Registry from '../../../src/ecs/Registry';
import { PhysicsBodyOptions, PhysicsShape } from '../../../src/physics/PhysicsBodyOptions';
import PhysicsBridge from '../../../src/physics/PhysicsBridge';

const shapeCases: Array<[PhysicsShape, string]> = [
    [{ kind: 'box', width: 20, height: 10 }, 'box'],
    [{ kind: 'circle', radius: 10 }, 'circle'],
    [{ kind: 'capsule', halfHeight: 10, radius: 5 }, 'capsule'],
    [
        {
            kind: 'polygon',
            vertices: [
                { x: 0, y: 0 },
                { x: 20, y: 0 },
                { x: 0, y: 20 },
            ],
        },
        'polygon',
    ],
    [{ kind: 'segment', length: 20, horizontal: true }, 'segment'],
];

describe('PhysicsBridge body creation', () => {
    test.each(shapeCases)('creates %p bodies from plain shape data', (shape, expectedType) => {
        const bridge = new PhysicsBridge();
        const entity = new Registry().createEntity();
        const options: PhysicsBodyOptions = { shape, mass: shape.kind === 'segment' ? 0 : 2 };

        bridge.addPhysicsBody(entity, { x: 12, y: 34 }, options);

        const body = bridge.getPhysicsBodyByEntity(entity);
        expect(body.shape.kind).toBe(expectedType);
        expect(body.position.x).toBe(12);
        expect(body.position.y).toBe(34);
        expect(body.mass).toBe(options.mass);
    });

    test('applies density and optional body properties', () => {
        const bridge = new PhysicsBridge();
        const entity = new Registry().createEntity();

        bridge.addPhysicsBody(
            entity,
            { x: 3, y: 4 },
            {
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
            },
        );

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

    test('returns body state without sharing mutable gravity objects', () => {
        const bridge = new PhysicsBridge();
        const entity = new Registry().createEntity();
        bridge.addPhysicsBody(entity, { x: 3, y: 4 }, { shape: { kind: 'box', width: 10, height: 20 }, mass: 2 });

        const state = bridge.getPhysicsBodyByEntity(entity);
        state.position.x = 99;
        if (state.shape.kind === 'box') state.shape.width = 99;

        const nextState = bridge.getPhysicsBodyByEntity(entity);
        expect(nextState.position.x).toBe(3);
        expect(nextState.shape).toEqual({ kind: 'box', width: 10, height: 20 });
    });
});
