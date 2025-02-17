import LifetimeComponent from '../components/LifetimeComponent';
import Registry from '../ecs/Registry';
import System from '../ecs/System';

export default class LifetimeSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(LifetimeComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const lifeTime = this.registry.getComponent(entity, LifetimeComponent);

            if (!lifeTime) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            // Kill projectiles after they reach their duration limit
            if (performance.now() - lifeTime.startTime > lifeTime.lifetime) {
                this.registry.killEntity(entity);
            }
        }
    }
}
