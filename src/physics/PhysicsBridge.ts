import { BoxShape, RigidBody, World } from 'gravity.js';

export default class PhysicsBridge {
    private _world: World;

    private _entityIdToBody: Map<number, RigidBody>;
    private _bodyIdToEntityId: Map<number, number>;

    constructor(gravity = 9.8) {
        this._world = new World(gravity);

        this._entityIdToBody = new Map();
        this._bodyIdToEntityId = new Map();
    }

    addBody(entityId: number) {
        const shape = new BoxShape(20, 20);
        const body = new RigidBody(shape, 0, 0, 1);
        this._world.addBody(body);

        this._entityIdToBody.set(entityId, body);
        this._bodyIdToEntityId.set(body.id, entityId);
    }

    removeBody(entityId: number) {
        const body = this._entityIdToBody.get(entityId);

        if (!body) {
            throw new Error('Could not find RigidBody assignet to entity with id ' + entityId);
        }

        // TODO: maybe a gravity method to remove body by id would be better, it would avoid storing the rigidbody here
        this._world.removeBody(body);

        // TODO: remove entries from map
    }
}
