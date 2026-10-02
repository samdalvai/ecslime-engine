import { PhysicsBridge, System } from 'ecslime-engine';

import { RigidBodyComponent, TransformComponent } from '../components';

export default class PhysicsSystem extends System {
    constructor() {
        super();
        this.requireComponent(TransformComponent);
        this.requireComponent(RigidBodyComponent);
    }

    update(deltaTime: number, physicsBridge: PhysicsBridge) {
        for (const entity of this.getSystemEntities()) {
            // Add bodies to physics world if not already initialized
            if (!physicsBridge.hasPhysicsBody(entity)) {
                const transform = entity.getComponent(TransformComponent);
                const rigidBody = entity.getComponent(RigidBodyComponent);

                if (!transform || !rigidBody) {
                    throw new Error('Could not find component ....bla bla bla');
                }

                physicsBridge.addPhysicsBody(entity, transform.position, {
                    ...rigidBody.options,
                    // TODO: should we use the same unit measure?
                    rotation: rigidBody.options.rotation ?? (transform.rotation * Math.PI) / 180,
                });
            }
        }

        physicsBridge.update(deltaTime);

        // Synchronize ecs components with physics simulation
        for (const entity of this.getSystemEntities()) {
            const transform = entity.getComponent(TransformComponent);
            const rigidBody = entity.getComponent(RigidBodyComponent);

            if (!transform || !rigidBody) {
                throw new Error('Could not find component ....bla bla bla');
            }

            const body = physicsBridge.getPhysicsBodyByEntity(entity);
            transform.position.x = body.position.x;
            transform.position.y = body.position.y;

            // TODO: should we use the same unit measure?
            transform.rotation = (body.rotation * 180) / Math.PI;
        }
    }
}
