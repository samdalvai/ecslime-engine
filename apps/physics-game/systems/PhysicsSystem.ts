import { PhysicsBridge, System } from 'ecslime-engine';

import { TransformComponent } from '../components';

export default class PhysicsSystem extends System {
    constructor() {
        super();
        this.requireComponent(TransformComponent);
    }

    update(deltaTime: number, physicsBridge: PhysicsBridge) {
        for (const entity of this.getSystemEntities()) {
            // Add bodies to physics world if not already initialized
            if (!physicsBridge.hasPhysicsBody(entity)) {
                physicsBridge.addPhysicsBody(entity);
            }
        }

        physicsBridge.update(deltaTime);
    }
}
