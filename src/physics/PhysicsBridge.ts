import { BoxShape, RigidBody, World } from 'gravity.js';

import Entity from '../ecs/Entity';

export default class PhysicsBridge {
    private _world: World;

    private _entityToBody: Map<Entity, RigidBody>;
    private _bodyToEntity: Map<RigidBody, Entity>;

    constructor(gravity = 9.8) {
        this._world = new World(gravity);

        this._entityToBody = new Map();
        this._bodyToEntity = new Map();
    }

    // TODO: should add parameters to define shape and material properties
    addBody(entity: Entity) {
        const shape = new BoxShape(20, 20);
        const body = new RigidBody(shape, 0, 0, 1);
        this._world.addBody(body);

        this._entityToBody.set(entity, body);
        this._bodyToEntity.set(body, entity);
    }

    removeBody(entity: Entity) {
        const body = this._entityToBody.get(entity);

        if (!body) {
            throw new Error('Could not find RigidBody assignet to entity with id ' + entity.getId());
        }

        // TODO: maybe a gravity.js method to remove body by id would be better, it would avoid storing the rigidbody here
        this._world.removeBody(body);

        this._bodyToEntity.delete(body);
        this._entityToBody.delete(entity);
    }
}
