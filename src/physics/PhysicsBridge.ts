import {
    BodiesFactory,
    BoxShape,
    CapsuleShape,
    CircleShape,
    CollisionCategory,
    PolygonShape,
    RigidBody,
    SETTINGS,
    SegmentShape,
    Vec2,
    World,
} from 'gravity.js';

import Entity from '../ecs/Entity';
import { Vector } from '../types/utils';
import { PhysicsBodyOptions, PhysicsBodyState, PhysicsShape } from './PhysicsBodyOptions';

export default class PhysicsBridge {
    private accumulator = 0;
    private readonly fixedDt = SETTINGS.timeStep;

    private _world: World;

    private _entityToBody: Map<Entity, RigidBody>;
    private _bodyToEntity: Map<RigidBody, Entity>;

    constructor(gravity = 9.8, subSteps = 1) {
        this._world = new World(gravity);

        SETTINGS.subSteps = subSteps;

        this._entityToBody = new Map();
        this._bodyToEntity = new Map();
    }

    addPhysicsBody(entity: Entity, position: Vector, options: PhysicsBodyOptions) {
        if (this.hasPhysicsBody(entity)) {
            throw new Error('Entity with id ' + entity.getId() + ' already has a physics body');
        }

        const shape = createShape(options.shape);
        const bodyOptions = {
            x: position.x,
            y: position.y,
            rotation: options.rotation,
            velocity: options.velocity ? new Vec2(options.velocity.x, options.velocity.y) : undefined,
            angularVelocity: options.angularVelocity,
            canRotate: options.canRotate,
            isBullet: options.isBullet,
            restitution: options.restitution,
            friction: options.friction,
            rollingResistance: options.rollingResistance,
            surfaceSpeed: options.surfaceSpeed,
            charge: options.charge,
            temperature: options.temperature,
            gravityScale: options.gravityScale,
            collisionCategory: options.collisionCategory as CollisionCategory | undefined,
            collisionMask: options.collisionMask as CollisionCategory | undefined,
        };
        let body: RigidBody;
        if (options.mass !== undefined) {
            body = BodiesFactory.fromShape(shape, { ...bodyOptions, mass: options.mass });
        } else if (options.density !== undefined) {
            body = BodiesFactory.fromShape(shape, { ...bodyOptions, density: options.density });
        } else {
            throw new Error('Physics body requires mass or density');
        }
        this._world.addBody(body);

        this._entityToBody.set(entity, body);
        this._bodyToEntity.set(body, entity);
    }

    removePhysicsBody(entity: Entity) {
        const body = this._entityToBody.get(entity);

        if (!body) {
            throw new Error('Could not find RigidBody assignet to entity with id ' + entity.getId());
        }

        // TODO: maybe a gravity.js method to remove body by id would be better, it would avoid storing the rigidbody here
        this._world.removeBody(body);

        this._bodyToEntity.delete(body);
        this._entityToBody.delete(entity);
    }

    getPhysicsBodyByEntity(entity: Entity): PhysicsBodyState {
        const body = this._entityToBody.get(entity);
        if (!body) {
            throw new Error('No physics body associated with entity with id ' + entity.getId());
        }

        return {
            position: { x: body.position.x, y: body.position.y },
            rotation: body.rotation,
            velocity: { x: body.velocity.x, y: body.velocity.y },
            angularVelocity: body.angularVelocity,
            shape: describeShape(body.shape),
            mass: body.mass,
            density: body.density,
            restitution: body.restitution,
            friction: body.friction,
            rollingResistance: body.rollingResistance,
            canRotate: body.canRotate,
            gravityScale: body.gravityScale,
            isBullet: body.isBullet,
            collisionCategory: body.collisionCategory,
            collisionMask: body.collisionMask,
        };
    }

    getEntityByPhysicsBody(body: RigidBody) {
        if (!this._bodyToEntity.has(body)) {
            throw new Error('No entity associated with body with id ' + body.id);
        }

        return this._bodyToEntity.get(body)!;
    }

    update(deltaTime: number) {
        // Limit catch-up work after a long pause.
        this.accumulator = Math.min(this.accumulator + deltaTime, this.fixedDt * 5);

        // This accumulator makes the physics run at fixed time steps regardless
        // of the fps of the ecs game engine
        while (this.accumulator >= this.fixedDt) {
            this._world.update();
            this.accumulator -= this.fixedDt;
        }
    }

    hasPhysicsBody(entity: Entity) {
        return this._entityToBody.get(entity) !== undefined;
    }
}

function describeShape(shape: RigidBody['shape']): PhysicsShape {
    if (shape instanceof BoxShape) return { kind: 'box', width: shape.width, height: shape.height };
    if (shape instanceof CircleShape) return { kind: 'circle', radius: shape.radius };
    if (shape instanceof CapsuleShape) return { kind: 'capsule', halfHeight: shape.halfHeight, radius: shape.radius };
    if (shape instanceof SegmentShape) {
        const [a, b] = shape.localVertices;
        return { kind: 'segment', length: Math.hypot(b.x - a.x, b.y - a.y), horizontal: a.y === b.y };
    }
    if (shape instanceof PolygonShape) {
        return { kind: 'polygon', vertices: shape.localVertices.map(vertex => ({ x: vertex.x, y: vertex.y })) };
    }
    throw new Error('Unsupported physics shape');
}

function createShape(shape: PhysicsShape) {
    switch (shape.kind) {
        case 'box':
            return new BoxShape(shape.width, shape.height);
        case 'circle':
            return new CircleShape(shape.radius);
        case 'capsule':
            return new CapsuleShape(shape.halfHeight, shape.radius);
        case 'polygon':
            return new PolygonShape(shape.vertices.map(vertex => new Vec2(vertex.x, vertex.y)));
        case 'segment':
            return new SegmentShape(shape.length, shape.horizontal);
    }
}
