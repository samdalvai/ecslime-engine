import { System } from 'ecslime-engine';

import LifetimeComponent from '../components/LifetimeComponent';

export default class LifetimeSystem extends System {
    constructor() {
        super();
        this.requireComponent(LifetimeComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const lifeTime = entity.getComponent(LifetimeComponent);

            // Kill projectiles after they reach their duration limit
            if (performance.now() - lifeTime.startTime > lifeTime.lifetime) {
                entity.kill();
            }
        }
    }
}
