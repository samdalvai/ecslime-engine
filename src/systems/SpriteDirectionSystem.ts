import HealthComponent from '../components/HealthComponent';
import RigidBodyComponent from '../components/RigidBodyComponent';
import SpriteComponent from '../components/SpriteComponent';
import SpriteDirectionComponent from '../components/SpriteDirectionComponent';
import System from '../ecs/System';

export default class SpriteDirectionSystem extends System {
    constructor(registry: Registry) {
        super(registry);
        this.requireComponent(SpriteDirectionComponent);
        this.requireComponent(SpriteComponent);
        this.requireComponent(RigidBodyComponent);
    }

    update() {
        for (const entity of this.getSystemEntities()) {
            const sprite = this.registry.getComponent(entity, SpriteComponent);
            const rigidBody = this.registry.getComponent(entity, RigidBodyComponent);

            if (!sprite || !rigidBody) {
                throw new Error('Could not find some component(s) of entity with id ' + entity);
            }

            let hurtSprite = false;

            if (entity.hasComponent(HealthComponent)) {
                const health = this.registry.getComponent(entity, HealthComponent);

                if (!health) {
                    throw new Error('Could not find some component(s) of entity with id ' + entity);
                }

                if (health.lastDamageTime !== 0 && performance.now() - health.lastDamageTime <= 500) {
                    hurtSprite = true;
                }
            }

            if (rigidBody.direction.y < 0) {
                sprite.srcRect.y = hurtSprite
                    ? sprite.height * 8
                    : rigidBody.velocity.y < 0
                        ? sprite.height * 4
                        : sprite.height * 0;
            } else if (rigidBody.direction.x > 0) {
                sprite.srcRect.y = hurtSprite
                    ? sprite.height * 9
                    : rigidBody.velocity.x > 0
                        ? sprite.height * 5
                        : sprite.height * 1;
            } else if (rigidBody.direction.y > 0) {
                sprite.srcRect.y = hurtSprite
                    ? sprite.height * 10
                    : rigidBody.velocity.y > 0
                        ? sprite.height * 6
                        : sprite.height * 2;
            } else if (rigidBody.direction.x < 0) {
                sprite.srcRect.y = hurtSprite
                    ? sprite.height * 11
                    : rigidBody.velocity.x < 0
                        ? sprite.height * 7
                        : sprite.height * 3;
            }
        }
    }
}
