import { BoxShape, FIXED_DELTA_TIME, RigidBody, World } from 'gravity.js';

import Entity from '../ecs/Entity';
import { Vector } from '../types/utils';

export default class PhysicsBridge {
    private accumulator = 0;
    private readonly fixedDt = FIXED_DELTA_TIME;

    private _world: World;

    private _entityToBody: Map<Entity, RigidBody>;
    private _bodyToEntity: Map<RigidBody, Entity>;

    constructor(gravity = 9.8) {
        this._world = new World(gravity);

        this._entityToBody = new Map();
        this._bodyToEntity = new Map();
    }

    // TODO: should add parameters to define shape and material properties
    addPhysicsBody(entity: Entity, position: Vector, mass: number) {
        const shape = new BoxShape(20, 20);
        const body = new RigidBody(shape, position.x, position.y, mass);
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

    getPhysicsBodyByEntity(entity: Entity) {
        if (!this._entityToBody.has(entity)) {
            throw new Error('No physics body associated with entity with id ' + entity.getId());
        }

        return this._entityToBody.get(entity)!;
    }

    getEntityByPhysicsBody(body: RigidBody) {
        if (!this._bodyToEntity.has(body)) {
            throw new Error('No entity associated with bodu with id ' + body.id);
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
