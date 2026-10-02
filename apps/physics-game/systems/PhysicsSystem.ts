import { PhysicsBridge, System } from 'ecslime-engine';
import { FIXED_DELTA_TIME } from 'gravity.js';

import { TransformComponent } from '../components';

export default class PhysicsSystem extends System {
    private accumulator = 0;
    private readonly fixedDt = FIXED_DELTA_TIME;

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

        // Limit catch-up work after a long pause.
        this.accumulator = Math.min(this.accumulator + deltaTime, this.fixedDt * 5);

        // This accumulator makes the physics run at fixed time steps regardless
        // of the fps of the ecs game engine
        while (this.accumulator >= this.fixedDt) {
            physicsBridge.step();
            this.accumulator -= this.fixedDt;
        }
    }
}
